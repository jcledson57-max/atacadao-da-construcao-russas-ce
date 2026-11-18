import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Loader2, Pencil, Plus, Shield, Trash2, LockKeyhole, UnlockKeyhole, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TeamHeader, TeamNavigation } from '@/components/site/TeamHeader';
import { currentTeamAccess, teamAccessQuery, roleLabel, canRemoveAdministrator, type TeamRole } from '@/lib/team-access';
import { listTeam, saveTeamAccount, deleteTeamAccount } from '@/lib/team.functions';
import { formatDateTime } from '@/lib/format';
import { HOSTED_USERS_URL, teamManagementAvailable } from '@/lib/team-hosting';

export const Route = createFileRoute('/_authenticated/usuarios')({
  beforeLoad: async () => { const access = await currentTeamAccess(); if (!access.manage) throw redirect({ to: '/admin' }); },
  head: () => ({ meta: [
    { title: 'Usuários e Permissões — Atacadão da Construção' },
    { name: 'description', content: 'Gerenciamento seguro dos acessos da equipe do Atacadão da Construção.' },
    { property: 'og:title', content: 'Usuários e Permissões — Atacadão da Construção' },
    { property: 'og:description', content: 'Gerenciamento seguro dos acessos da equipe do Atacadão da Construção.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }), component: UsersPage,
});

type Draft = { id?: string; name: string; email: string; password: string; role: TeamRole; blocked: boolean };
function UsersPage() {
  const qc = useQueryClient(); const access = useQuery(teamAccessQuery);
  const fetchTeam = useServerFn(listTeam); const save = useServerFn(saveTeamAccount); const remove = useServerFn(deleteTeamAccount);
  const users = useQuery({ queryKey: ['team-users'], queryFn: () => fetchTeam(), enabled: !!access.data?.manage && teamManagementAvailable });
  const [draft, setDraft] = useState<Draft | null>(null); const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false); const [search, setSearch] = useState('');
  const activeAdmins = users.data?.filter(u => u.role === 'admin' && !u.blocked).length ?? 0;
  async function refresh() { await qc.invalidateQueries({ queryKey: ['team-users'] }); await qc.invalidateQueries({ queryKey: ['team-access'] }); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!draft) return; setBusy(true);
    try { await save({ data: { ...draft, password: draft.password || undefined } }); setDraft(null); toast.success('Usuário salvo.'); await refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function toggle(u: NonNullable<typeof users.data>[number]) {
    if (u.role !== 'admin' && u.role !== 'attendant') return;
    setBusy(true); try { await save({ data: { ...u, role: u.role, blocked: !u.blocked } }); toast.success(u.blocked ? 'Usuário desbloqueado.' : 'Usuário bloqueado.'); await refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function deleteUser() {
    if (!deleting) return; setBusy(true);
    try { await remove({ data: { id: deleting.id, confirmed: true } }); setDeleting(null); toast.success('Usuário excluído e acesso revogado.'); await refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  if (!teamManagementAvailable) return <div className="min-h-screen bg-background"><TeamHeader name={access.data?.name} role={access.data?.role} /><main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><TeamNavigation /><h1 className="text-3xl font-extrabold uppercase text-primary">Usuários e Permissões</h1><div role="status" className="space-y-3 border-l-4 border-accent bg-accent/10 p-4"><p className="font-semibold">O cadastro de usuários está disponível no painel do Lovable.</p><p className="text-sm text-muted-foreground">O GitHub Pages não permite cadastrar, editar ou bloquear contas. Abra o painel seguro e entre com seu e-mail e senha de administrador.</p></div><Button asChild variant="accent"><a href={HOSTED_USERS_URL} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir gestão de usuários</a></Button></main></div>;
  return <div className="min-h-screen bg-background"><TeamHeader name={access.data?.name} role={access.data?.role} /><main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    {access.data?.manage ? <><TeamNavigation /><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-extrabold uppercase text-primary">Usuários e Permissões</h1><p className="text-sm text-muted-foreground">{users.data?.length ?? 0} usuários cadastrados</p></div><Button variant="accent" onClick={() => setDraft({ name: '', email: '', password: '', role: 'attendant', blocked: false })}><Plus /> Novo usuário</Button></div>
    <Input className="max-w-sm" placeholder="Buscar nome ou e-mail" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar usuários" />
    {users.isLoading ? <Loader2 className="animate-spin" /> : users.error ? <p role="alert" className="text-destructive">{users.error.message}</p> : <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr>{['Nome', 'E-mail', 'Tipo de acesso', 'Situação', 'Data de cadastro', 'Ações'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{users.data?.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())).map(u => {
      const protectedAdmin = !canRemoveAdministrator(u.role, !u.blocked, activeAdmins);
      return <tr key={u.id} className="border-t"><td className="p-3 font-semibold">{u.name || 'Nome não informado'}</td><td className="p-3">{u.email}</td><td className="p-3"><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-accent/20 text-foreground'}`}><Shield className="h-3 w-3" />{roleLabel(u.role)}</span></td><td className="p-3"><span className={u.blocked ? 'text-destructive' : 'text-success'}>{u.blocked ? 'Bloqueado' : 'Ativo'}</span></td><td className="whitespace-nowrap p-3">{formatDateTime(u.created_at)}</td><td className="p-3"><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Editar ${u.email}`} title="Editar usuário" disabled={busy} onClick={() => setDraft({ ...u, role: u.role === 'admin' ? 'admin' : 'attendant', password: '' })}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`${u.blocked ? 'Desbloquear' : 'Bloquear'} ${u.email}`} title={protectedAdmin ? 'Último administrador ativo protegido' : u.blocked ? 'Desbloquear usuário' : 'Bloquear usuário'} disabled={busy || protectedAdmin} onClick={() => toggle(u)}>{u.blocked ? <UnlockKeyhole /> : <LockKeyhole />}</Button><Button variant="ghost" size="icon" aria-label={`Excluir ${u.email}`} title={protectedAdmin ? 'Último administrador ativo protegido' : 'Excluir usuário'} disabled={busy || protectedAdmin} onClick={() => setDeleting({ id: u.id, name: u.name || u.email })}><Trash2 className="text-destructive" /></Button></div></td></tr>;
    })}</tbody></table></div>}</> : <p role="alert">{access.isLoading ? 'Verificando acesso…' : 'Acesso exclusivo do administrador.'}</p>}
    <Dialog open={!!draft && !!access.data?.manage} onOpenChange={o => { if (!o && !busy) setDraft(null); }}><DialogContent><DialogHeader><DialogTitle>{draft?.id ? 'Editar usuário' : 'Novo usuário'}</DialogTitle><DialogDescription>Conta individual da equipe.</DialogDescription></DialogHeader>{draft && <form className="space-y-4" onSubmit={submit}><div><Label htmlFor="team-name">Nome completo</Label><Input id="team-name" value={draft.name} minLength={2} maxLength={120} required onChange={e => setDraft({ ...draft, name: e.target.value })} /></div><div><Label htmlFor="team-email">E-mail de acesso</Label><Input id="team-email" type="email" value={draft.email} required onChange={e => setDraft({ ...draft, email: e.target.value })} /></div><div><Label htmlFor="team-password">{draft.id ? 'Nova senha (opcional)' : 'Senha inicial'}</Label><Input id="team-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required={!draft.id} value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} /></div><div><Label htmlFor="team-role">Nível de acesso</Label><select id="team-role" className="h-10 w-full rounded-md border bg-background px-3" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as TeamRole })}><option value="attendant">Atendente de Orçamentos</option><option value="admin">Administrador</option></select></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" variant="accent" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Salvar usuário</Button></div></form>}</DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={o => { if (!o && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir usuário?</DialogTitle><DialogDescription>O acesso de {deleting?.name} será revogado permanentemente. Seus registros de consulta serão preservados para auditoria.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={deleteUser}>Confirmar exclusão</Button></div></DialogContent></Dialog>
  </main></div>;
}