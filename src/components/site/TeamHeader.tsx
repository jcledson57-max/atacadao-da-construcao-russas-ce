import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Brand } from './Brand';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { roleLabel } from '@/lib/team-access';

export function TeamHeader({ name, role }: { name?: string; role?: string | null }) {
  const qc = useQueryClient(); const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true });
  }
  return <header className="border-b bg-card"><div className="hazard-stripe h-1.5" /><div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3"><Brand /><div className="flex items-center gap-3"><div className="text-right text-sm"><p className="font-semibold">{name}</p><p className="text-muted-foreground">{roleLabel(role ?? null)}</p></div><Button variant="outline" size="sm" onClick={signOut}><LogOut /> Sair</Button></div></div></header>;
}

export function TeamNavigation() {
  return <nav className="flex flex-wrap gap-2 border-b pb-4"><Button asChild variant="outline"><Link to="/admin">Painel administrativo</Link></Button><Button asChild variant="accent"><Link to="/usuarios">Usuários e Permissões</Link></Button></nav>;
}