create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- First account created becomes admin; later accounts get no privileges.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Public reads active categories" on public.categories for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "Admins insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  unit text not null check (char_length(unit) between 1 and 20),
  price numeric(12,2) not null check (price >= 0 and price <= 1000000),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  active boolean not null default true,
  is_demo boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Public reads active products" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "Admins insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default '' check (char_length(store_name) <= 100),
  logo_url text check (logo_url is null or char_length(logo_url) <= 500),
  whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  address text not null default '' check (char_length(address) <= 300),
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "Public reads settings" on public.store_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.store_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger settings_touch before update on public.store_settings for each row execute function public.touch_updated_at();
insert into public.store_settings (id) values (1);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text,
  total numeric(14,2) not null,
  origin text not null default 'SITE/CATÁLOGO ONLINE',
  created_at timestamptz not null default now()
);
grant select, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;
create policy "Admins read quotes" on public.quotes for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete quotes" on public.quotes for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid,
  product_name text not null,
  unit text not null,
  unit_price numeric(12,2) not null,
  quantity numeric(12,3) not null,
  subtotal numeric(14,2) not null
);
grant select on public.quote_items to authenticated;
grant all on public.quote_items to service_role;
alter table public.quote_items enable row level security;
create policy "Admins read quote items" on public.quote_items for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.create_quote(_name text, _phone text, _address text, _items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_code text; v_total numeric(14,2) := 0; v_created timestamptz;
  it jsonb; p record; q numeric; v_items jsonb := '[]'::jsonb; v_digits text;
begin
  _name := btrim(coalesce(_name,'')); _address := nullif(btrim(coalesce(_address,'')),'');
  v_digits := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  if char_length(_name) < 2 or char_length(_name) > 100 then raise exception 'Nome inválido'; end if;
  if char_length(v_digits) < 10 or char_length(v_digits) > 13 then raise exception 'Telefone inválido'; end if;
  if _address is not null and char_length(_address) > 300 then raise exception 'Endereço muito longo'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 100 then raise exception 'Itens inválidos'; end if;

  v_code := 'ORC-' || to_char(now() at time zone 'America/Sao_Paulo','YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text),1,6));
  insert into public.quotes (code, customer_name, customer_phone, delivery_address, total)
  values (v_code, _name, v_digits, _address, 0) returning id, created_at into v_id, v_created;

  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'quantity')::numeric;
    if q is null or q <= 0 or q > 100000 then raise exception 'Quantidade inválida'; end if;
    select id, name, unit, price into p from public.products where id = (it->>'product_id')::uuid and active;
    if not found then raise exception 'Produto indisponível'; end if;
    insert into public.quote_items (quote_id, product_id, product_name, unit, unit_price, quantity, subtotal)
    values (v_id, p.id, p.name, p.unit, p.price, q, round(p.price * q, 2));
    v_total := v_total + round(p.price * q, 2);
    v_items := v_items || jsonb_build_object('product_name', p.name, 'unit', p.unit, 'unit_price', p.price, 'quantity', q, 'subtotal', round(p.price*q,2));
  end loop;
  update public.quotes set total = v_total where id = v_id;
  return jsonb_build_object('id', v_id, 'code', v_code, 'created_at', v_created, 'total', v_total, 'items', v_items,
    'customer_name', _name, 'customer_phone', v_digits, 'delivery_address', _address);
end; $$;
revoke all on function public.create_quote(text,text,text,jsonb) from public;
grant execute on function public.create_quote(text,text,text,jsonb) to anon, authenticated;

create policy "Anyone reads store images" on storage.objects for select to anon, authenticated using (bucket_id = 'store-images');
create policy "Admins upload store images" on storage.objects for insert to authenticated with check (bucket_id = 'store-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins update store images" on storage.objects for update to authenticated using (bucket_id = 'store-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete store images" on storage.objects for delete to authenticated using (bucket_id = 'store-images' and public.has_role(auth.uid(),'admin'));

insert into public.categories (name, slug, sort_order) values ('Cimentos','cimentos',1), ('Ferragens','ferragens',2);
insert into public.products (category_id, name, description, unit, price, image_url, is_demo, sort_order)
select c.id, v.name, v.descr, v.unit, v.price, v.img, true, v.ord from (values
 ('cimentos','Cimento CP II (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','saco 50kg',1.00,'/images/cimento.jpg',1),
 ('cimentos','Cimento CP V (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','saco 40kg',2.00,'/images/cimento.jpg',2),
 ('ferragens','Vergalhão 10mm (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','barra 12m',3.00,'/images/vergalhao.jpg',3),
 ('ferragens','Arame recozido (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','quilo',4.00,'/images/arame.jpg',4),
 ('ferragens','Prego 17x27 (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','quilo',5.00,'/images/pregos.jpg',5),
 ('ferragens','Treliça H8 (exemplo)','Produto de demonstração. Substitua pelo produto real no painel.','unidade',6.00,'/images/trelica.jpg',6)
) as v(cat,name,descr,unit,price,img,ord) join public.categories c on c.slug = v.cat;