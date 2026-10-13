import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, LogOut, Pencil, Plus, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Brand } from "@/components/site/Brand";
import { QuoteTable } from "@/components/site/QuoteTable";
import { DemoBadge } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime, formatPhone } from "@/lib/format";
import { DISCLAIMER, downloadQuotePdf, type SavedQuote } from "@/lib/quote-output";
import {
  categoriesQuery, IMAGE_BUCKET, productsQuery, settingsQuery, STORAGE_PREFIX,
  type Category, type Product,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo" },
      { name: "description", content: "Gestão de produtos, configurações e orçamentos." },
      { property: "og:title", content: "Painel administrativo" },
      { property: "og:description", content: "Gestão de produtos, configurações e orçamentos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem acima de 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return STORAGE_PREFIX + path;
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin");
      return { isAdmin: !!data?.length, email: u.user?.email };
    },
  });
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="hazard-stripe h-1.5" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{role.data?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut /> Sair</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {role.isLoading ? (
          <Loader2 className="animate-spin" />
        ) : !role.data?.isAdmin ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 text-2xl font-bold text-primary">Acesso negado</h1>
            <p className="text-muted-foreground">Esta conta não tem permissão de administrador.</p>
            <Button asChild className="mt-4"><Link to="/">Voltar ao site</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-4xl font-extrabold uppercase text-primary">Painel administrativo</h1>
            <Tabs defaultValue="orcamentos">
              <TabsList className="mb-6 flex h-auto flex-wrap">
                <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
                <TabsTrigger value="produtos">Produtos</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="loja">Configurações da loja</TabsTrigger>
              </TabsList>
              <TabsContent value="orcamentos"><QuotesTab /></TabsContent>
              <TabsContent value="produtos"><ProductsTab /></TabsContent>
              <TabsContent value="categorias"><CategoriesTab /></TabsContent>
              <TabsContent value="loja"><SettingsTab /></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Produtos ---------------- */
const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  category_id: z.string().uuid("Escolha a categoria"),
  description: z.string().trim().max(1000),
  unit: z.string().trim().min(1, "Informe a unidade").max(20),
  price: z.number({ invalid_type_error: "Preço inválido" }).min(0).max(1000000),
  active: z.boolean(),
  is_demo: z.boolean(),
});

type Draft = { id?: string; name: string; category_id: string; description: string; unit: string; price: string; active: boolean; is_demo: boolean; image_url: string | null; image?: string | null };

function ProductsTab() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function open(p?: Product) {
    setFile(null);
    setDraft(p
      ? { id: p.id, name: p.name, category_id: p.category_id, description: p.description, unit: p.unit, price: String(p.price).replace(".", ","), active: p.active, is_demo: p.is_demo, image_url: p.image_url, image: p.image }
      : { name: "", category_id: categories[0]?.id ?? "", description: "", unit: "unidade", price: "", active: true, is_demo: false, image_url: null });
  }

  async function save() {
    if (!draft) return;
    const parsed = productSchema.safeParse({ ...draft, price: Number(draft.price.replace(/\./g, "").replace(",", ".")) });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const image_url = file ? await uploadImage(file) : draft.image_url;
      const row = { ...parsed.data, image_url };
      const { error } = draft.id
        ? await supabase.from("products").update(row).eq("id", draft.id)
        : await supabase.from("products").insert(row);
      if (error) throw error;
      toast.success("Produto salvo.");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p: Product) {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-between gap-2">
        <p className="text-sm text-muted-foreground">{products.length} produtos</p>
        <Button variant="accent" onClick={() => open()} disabled={!categories.length}><Plus /> Novo produto</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Unidade</th><th className="p-3 text-right">Preço</th><th className="p-3">Ativo</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image && <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />}
                    <div><p className="font-semibold">{p.name}</p>{p.is_demo && <DemoBadge />}</div>
                  </div>
                </td>
                <td className="p-3">{categories.find((c) => c.id === p.category_id)?.name}</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3 text-right font-semibold">{formatBRL(p.price)}</td>
                <td className="p-3"><Switch checked={p.active} onCheckedChange={() => toggle(p)} aria-label="Ativo" /></td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => open(p)}><Pencil /> Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Unidade de venda</Label><Input value={draft.unit} maxLength={20} placeholder="saco, barra, quilo" onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
                <div className="space-y-1"><Label>Preço (R$)</Label><Input value={draft.price} inputMode="decimal" placeholder="0,00" onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Descrição</Label><Textarea value={draft.description} maxLength={1000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Foto</Label>
                {(file || draft.image) && <img src={file ? URL.createObjectURL(file) : draft.image!} alt="" className="h-24 w-24 rounded object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Ativo no catálogo</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={draft.is_demo} onCheckedChange={(v) => setDraft({ ...draft, is_demo: v })} /> Produto de demonstração (preço fictício)</label>
              <Button variant="accent" className="w-full" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Categorias ---------------- */
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function CategoriesTab() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });

  async function add() {
    const n = name.trim();
    if (!n || n.length > 80) return toast.error("Nome inválido");
    const { error } = await supabase.from("categories").insert({ name: n, slug: slugify(n) || crypto.randomUUID().slice(0, 8), sort_order: categories.length + 1 });
    if (error) return toast.error(error.message);
    setName("");
    refresh();
  }
  async function update(c: Category, patch: Partial<Category>) {
    const { error } = await supabase.from("categories").update(patch).eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" maxLength={80} />
        <Button variant="accent" onClick={add}><Plus /> Adicionar</Button>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <Input className="flex-1" defaultValue={c.name} maxLength={80} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c, { name: e.target.value.trim() })} />
            <Input type="number" className="w-20" defaultValue={c.sort_order} aria-label="Ordem" onBlur={(e) => Number(e.target.value) !== c.sort_order && update(c, { sort_order: Number(e.target.value) || 0 })} />
            <Switch checked={c.active} onCheckedChange={(v) => update(c, { active: v })} aria-label="Ativa" />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Edite o nome e a ordem e clique fora do campo para salvar. Categorias inativas somem do site.</p>
    </div>
  );
}

/* ---------------- Configurações ---------------- */
const settingsSchema = z.object({
  store_name: z.string().trim().max(100),
  whatsapp: z.string().regex(/^\d{0,15}$/, "WhatsApp: apenas números, com 55 e DDD"),
  address: z.string().trim().max(300),
});

function SettingsTab() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [form, setForm] = useState({ store_name: "", whatsapp: "", address: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm({ store_name: data.store_name, whatsapp: data.whatsapp, address: data.address });
  }, [data]);

  async function save() {
    const p = settingsSchema.safeParse({ ...form, whatsapp: form.whatsapp.replace(/\D/g, "") });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    try {
      const logo_url = file ? await uploadImage(file) : (data?.logo_url ?? null);
      const { error } = await supabase.from("store_settings").update({ ...p.data, logo_url }).eq("id", 1);
      if (error) throw error;
      toast.success("Configurações salvas.");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-1"><Label>Nome da loja</Label><Input value={form.store_name} maxLength={100} onChange={(e) => setForm({ ...form, store_name: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>WhatsApp oficial (com código do país e DDD)</Label>
        <Input value={form.whatsapp} inputMode="numeric" placeholder="5511999999999" onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })} />
        <p className="text-xs text-muted-foreground">Exemplo de formato: 55 + DDD + número, somente dígitos.</p>
      </div>
      <div className="space-y-1"><Label>Endereço da loja</Label><Textarea value={form.address} maxLength={300} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>Logotipo</Label>
        {(file || data?.logo) && <img src={file ? URL.createObjectURL(file) : data!.logo!} alt="" className="h-16 w-16 rounded object-contain" />}
        <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button variant="accent" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Salvar configurações</Button>
    </div>
  );
}

/* ---------------- Orçamentos ---------------- */
function QuotesTab() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*, quote_items(*)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const [sel, setSel] = useState<SavedQuote & { origin: string } | null>(null);
  const [q, setQ] = useState("");
  const list = quotes.filter((x) => `${x.code} ${x.customer_name} ${x.customer_phone}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Input className="mb-4 max-w-sm" placeholder="Buscar por número, cliente ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? <Loader2 className="animate-spin" /> : list.length === 0 ? (
        <p className="text-muted-foreground">Nenhum orçamento recebido ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Número</th><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Telefone</th><th className="p-3">Origem</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-mono font-semibold">{x.code}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(x.created_at)}</td>
                  <td className="p-3">{x.customer_name}</td>
                  <td className="p-3 whitespace-nowrap">{formatPhone(x.customer_phone)}</td>
                  <td className="p-3"><span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold">{x.origin}</span></td>
                  <td className="p-3 text-right font-semibold">{formatBRL(Number(x.total))}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => setSel({ ...x, total: Number(x.total), items: x.quote_items.map((i) => ({ ...i, unit_price: Number(i.unit_price), quantity: Number(i.quantity), subtotal: Number(i.subtotal) })) })}>
                      <Eye /> Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Orçamento {sel?.code}</DialogTitle></DialogHeader>
          {sel && (
            <div className="text-sm">
              <p><b>Data:</b> {formatDateTime(sel.created_at)}</p>
              <p><b>Cliente:</b> {sel.customer_name}</p>
              <p><b>Telefone:</b> {formatPhone(sel.customer_phone)}</p>
              {sel.delivery_address && <p><b>Entrega:</b> {sel.delivery_address}</p>}
              <p><b>Origem:</b> {sel.origin}</p>
              <QuoteTable items={sel.items} total={sel.total} />
              <p className="mt-3 text-xs text-muted-foreground">Preços registrados no momento do orçamento. {DISCLAIMER}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => downloadQuotePdf(sel, settings)}>Baixar PDF</Button>
                <Button asChild variant="whatsapp">
                  <a href={`https://wa.me/55${sel.customer_phone.replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer">Chamar cliente no WhatsApp</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
