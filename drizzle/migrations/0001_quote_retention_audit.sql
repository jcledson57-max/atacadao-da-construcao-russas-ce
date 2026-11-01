CREATE TABLE public.quote_cleanup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_count integer NOT NULL,
  retention_days integer NOT NULL,
  cutoff_at timestamptz NOT NULL,
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL
);
GRANT SELECT ON public.quote_cleanup_history TO authenticated;
GRANT ALL ON public.quote_cleanup_history TO service_role;
ALTER TABLE public.quote_cleanup_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quote cleanup history" ON public.quote_cleanup_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE FUNCTION public.quote_cleanup_history_recent()
RETURNS SETOF public.quote_cleanup_history
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM public.quote_cleanup_history ORDER BY created_at DESC, id DESC LIMIT 10 $$;
REVOKE ALL ON FUNCTION public.quote_cleanup_history_recent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_cleanup_history_recent() TO authenticated;

CREATE FUNCTION public.delete_old_quotes(_days integer, _cutoff timestamptz, _expected_count integer, _confirmed boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_count integer;
  v_deleted integer;
BEGIN
  IF v_user IS NULL OR NOT public.has_role(v_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito ao administrador.';
  END IF;
  IF _confirmed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Confirmação expressa obrigatória.';
  END IF;
  IF _days IS NULL OR _days NOT IN (30, 60, 90, 180, 365) THEN
    RAISE EXCEPTION 'Período de retenção inválido.';
  END IF;
  IF _cutoff IS NULL OR NOT isfinite(_cutoff) OR _cutoff > now() - make_interval(days => _days) THEN
    RAISE EXCEPTION 'Data de corte inválida.';
  END IF;
  IF _expected_count IS NULL OR _expected_count <= 0 THEN
    RAISE EXCEPTION 'Nenhum orçamento confirmado para exclusão.';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  IF v_email IS NULL THEN RAISE EXCEPTION 'E-mail do administrador indisponível.'; END IF;
  LOCK TABLE public.quotes IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*) INTO v_count FROM public.quotes WHERE created_at < _cutoff;
  IF v_count <> _expected_count THEN
    RAISE EXCEPTION 'A quantidade mudou. Atualize as contagens e confirme novamente.';
  END IF;
  DELETE FROM public.quotes WHERE created_at < _cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  INSERT INTO public.quote_cleanup_history (deleted_count, retention_days, cutoff_at, admin_user_id, admin_email)
  VALUES (v_deleted, _days, _cutoff, v_user, v_email);
  RETURN jsonb_build_object('deleted_count', v_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_old_quotes(integer, timestamptz, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_old_quotes(integer, timestamptz, integer, boolean) TO authenticated;