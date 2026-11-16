import { supabase } from '@/integrations/supabase/client';

export type TeamRole = 'admin' | 'attendant';
export function teamPermissions(role: string | null, blocked = false) {
  return { quotes: !blocked && (role === 'admin' || role === 'attendant'), manage: !blocked && role === 'admin' };
}
export function canRemoveAdministrator(role: string, active: boolean, activeAdmins: number) {
  return role !== 'admin' || !active || activeAdmins > 1;
}
export const roleLabel = (role: string | null) => role === 'admin' ? 'Administrador' : role === 'attendant' ? 'Atendente de Orçamentos' : 'Sem acesso';

export async function currentTeamAccess() {
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error('Entre novamente para continuar.');
  const [profile, roles] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', auth.user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', auth.user.id),
  ]);
  if (profile.error || roles.error) throw new Error('Não foi possível verificar seu acesso.');
  const role: TeamRole | null = roles.data.some(r => r.role === 'admin') ? 'admin' : roles.data.some(r => r.role === 'attendant') ? 'attendant' : null;
  const permissions = teamPermissions(role, profile.data.blocked || !!profile.data.deleted_at);
  return { ...permissions, role, name: profile.data.full_name || auth.user.email || 'Usuário', email: auth.user.email, userId: auth.user.id };
}

export const teamAccessQuery = {
  queryKey: ['team-access'], queryFn: currentTeamAccess, staleTime: 0, refetchInterval: 15000,
};