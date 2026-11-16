import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const accountSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255), password: z.string().min(8).max(72).optional(),
  role: z.enum(['admin', 'attendant']), blocked: z.boolean(),
});

export const listTeam = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const permission = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (permission.error || !permission.data) throw new Error('Acesso exclusivo do administrador.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [profiles, roles] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').is('deleted_at', null).order('created_at'),
    supabaseAdmin.from('user_roles').select('user_id,role'),
  ]);
  if (profiles.error || roles.error) throw new Error('Não foi possível carregar os usuários.');
  return Promise.all(profiles.data.map(async p => {
    const auth = await supabaseAdmin.auth.admin.getUserById(p.id);
    if (auth.error) throw new Error('Não foi possível carregar o e-mail de uma conta.');
    const ownRoles = roles.data.filter(r => r.user_id === p.id);
    return { id: p.id, name: p.full_name, email: auth.data.user.email ?? '', blocked: p.blocked, created_at: p.created_at,
      role: ownRoles.some(r => r.role === 'admin') ? 'admin' : ownRoles.some(r => r.role === 'attendant') ? 'attendant' : 'user' };
  }));
});

export const saveTeamAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input)).handler(async ({ data, context }) => {
    const permission = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (permission.error || !permission.data) throw new Error('Acesso exclusivo do administrador.');
    if (!data.id && !data.password) throw new Error('Defina a senha inicial.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    let id = data.id;
    if (!id) {
      const created = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.name } });
      if (created.error || !created.data.user) throw new Error('Não foi possível criar a conta. Verifique se o e-mail já está cadastrado.');
      id = created.data.user.id;
    }
    const updated = await supabaseAdmin.rpc('manage_team_account', { _actor: context.userId, _target: id, _name: data.name, _role: data.role, _blocked: data.blocked, _delete: false });
    if (updated.error) throw new Error(updated.error.message);
    const auth = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: data.email, ...(data.password ? { password: data.password } : {}), ban_duration: data.blocked ? '876000h' : 'none',
    });
    if (auth.error) throw new Error('Permissões salvas, mas o e-mail ou a senha não foram atualizados. Confira os dados e tente novamente.');
    return { id };
  });

export const deleteTeamAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), confirmed: z.literal(true) }).parse(input))
  .handler(async ({ data, context }) => {
    const permission = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (permission.error || !permission.data) throw new Error('Acesso exclusivo do administrador.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const p = await supabaseAdmin.from('profiles').select('full_name').eq('id', data.id).single();
    const r = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.id);
    if (p.error || r.error) throw new Error('Usuário não encontrado.');
    const result = await supabaseAdmin.rpc('manage_team_account', { _actor: context.userId, _target: data.id, _name: p.data.full_name || 'Usuário', _role: r.data.some(x => x.role === 'admin') ? 'admin' : 'attendant', _blocked: true, _delete: true });
    if (result.error) throw new Error(result.error.message);
    // Archive identity instead of deleting it so historical actions remain attributable.
    const ban = await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: '876000h' });
    if (ban.error) throw new Error('Conta excluída do painel e acesso revogado; não foi possível atualizar o bloqueio do login.');
    return { ok: true };
  });