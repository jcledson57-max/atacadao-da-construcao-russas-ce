import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Brand } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso administrativo" },
      { name: "description", content: "Entrada da área administrativa da loja." },
      { property: "og:title", content: "Acesso administrativo" },
      { property: "og:description", content: "Entrada da área administrativa da loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/admin" }));
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) { toast.error("E-mail ou senha incorretos."); return; }
      navigate({ to: "/admin" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...p.data,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/admin" });
      else toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-steel px-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-card">
        <div className="mb-6"><Brand /></div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold uppercase text-primary"><Lock className="h-5 w-5" /> Área administrativa</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div className="space-y-1"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
          <Button type="submit" variant="accent" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "in" ? "Entrar" : "Criar conta"}</Button>
        </form>
        <button className="mt-4 text-sm text-muted-foreground hover:text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta — entrar"}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">A primeira conta criada torna-se a administradora. Contas criadas depois não têm acesso ao painel.</p>
      </div>
    </div>
  );
}
