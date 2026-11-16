CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL DEFAULT '',
 blocked boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
INSERT INTO public.profiles(id,full_name,created_at) SELECT id,coalesce(raw_user_meta_data->>'full_name',''),created_at FROM auth.users;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id=r.user_id WHERE r.user_id=_user_id AND r.role=_role AND NOT p.blocked AND p.deleted_at IS NULL)
$$;
CREATE POLICY "Team reads own profile or admins all" ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.profiles(id,full_name) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
 -- The established administrator is preserved; signup can never assign privileges.
 RETURN new;
END $$;
CREATE FUNCTION public.can_read_quotes() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'attendant') $$;
GRANT EXECUTE ON FUNCTION public.can_read_quotes() TO authenticated;
CREATE POLICY "Team reads quotes" ON public.quotes FOR SELECT TO authenticated USING(public.can_read_quotes());
CREATE POLICY "Team reads quote items" ON public.quote_items FOR SELECT TO authenticated USING(public.can_read_quotes());
CREATE POLICY "Team reads own notification reads" ON public.quote_reads FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.can_read_quotes());
CREATE POLICY "Team marks own notification reads" ON public.quote_reads FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.can_read_quotes());
CREATE POLICY "Team unmarks own notification reads" ON public.quote_reads FOR DELETE TO authenticated USING(user_id=auth.uid() AND public.can_read_quotes());
CREATE TABLE public.quote_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL, user_id uuid NOT NULL,
 user_name text NOT NULL, action text NOT NULL CHECK(action IN ('view','print')), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_access_events TO authenticated;
GRANT ALL ON public.quote_access_events TO service_role;
ALTER TABLE public.quote_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quote access history" ON public.quote_access_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.record_quote_access(_quote_id uuid,_action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.can_read_quotes() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF _action NOT IN ('view','print') OR NOT EXISTS(SELECT 1 FROM public.quotes WHERE id=_quote_id) THEN RAISE EXCEPTION 'Ação inválida'; END IF;
 INSERT INTO public.quote_access_events(quote_id,user_id,user_name,action) SELECT _quote_id,auth.uid(),full_name,_action FROM public.profiles WHERE id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.record_quote_access(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_quote_access(uuid,text) TO authenticated;
CREATE FUNCTION public.guard_last_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; losing boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(80615001);
 IF TG_TABLE_NAME='profiles' THEN
 target:=OLD.id; losing:=TG_OP='DELETE';
 IF TG_OP='UPDATE' THEN losing:=NEW.blocked OR NEW.deleted_at IS NOT NULL; END IF;
 ELSE
 target:=OLD.user_id; losing:=TG_OP='DELETE';
 IF TG_OP='UPDATE' THEN losing:=NEW.role<>'admin' OR NEW.user_id<>OLD.user_id; END IF;
 END IF;
 IF losing AND public.has_role(target,'admin') AND NOT EXISTS(SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id=r.user_id WHERE r.role='admin' AND r.user_id<>target AND NOT p.blocked AND p.deleted_at IS NULL) THEN
 RAISE EXCEPTION 'O último administrador ativo não pode ser bloqueado, excluído ou rebaixado.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard_admin BEFORE UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin();
CREATE TRIGGER roles_guard_admin BEFORE UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin();
CREATE FUNCTION public.manage_team_account(_actor uuid,_target uuid,_name text,_role public.app_role,_blocked boolean,_delete boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(80615001);
 IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'Acesso exclusivo do administrador'; END IF;
 IF _role NOT IN ('admin','attendant') OR char_length(btrim(_name))<2 OR char_length(_name)>120 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_target AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Usuário indisponível'; END IF;
 -- Remove/add roles before status; triggers serialize every operation and guard the last admin.
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target AND role=_role) THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(_target,_role);
 END IF;
 DELETE FROM public.user_roles WHERE user_id=_target AND role<>_role;
 UPDATE public.profiles SET full_name=btrim(_name),blocked=_blocked,deleted_at=CASE WHEN _delete THEN now() ELSE NULL END WHERE id=_target;
END $$;
REVOKE ALL ON FUNCTION public.manage_team_account(uuid,uuid,text,public.app_role,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_team_account(uuid,uuid,text,public.app_role,boolean,boolean) TO service_role;
CREATE INDEX quote_access_events_quote ON public.quote_access_events(quote_id,created_at DESC);
