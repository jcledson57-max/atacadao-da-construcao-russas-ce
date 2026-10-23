import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileDown, Info, Loader2, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell } from "@/components/site/PageShell";
import { DemoBadge } from "@/components/site/ProductCard";
import { QuoteTable } from "@/components/site/QuoteTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatBRL, formatDateTime, round2 } from "@/lib/format";
import { DISCLAIMER, downloadQuotePdf, whatsappMessage, whatsappUrl, type SavedQuote } from "@/lib/quote-output";
import { productsQuery, settingsQuery } from "@/lib/store";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Montar orçamento | Cimentos e Ferragens" },
      { name: "description", content: "Monte seu orçamento, baixe em PDF e envie para a loja pelo WhatsApp." },
      { property: "og:title", content: "Montar orçamento de cimentos e ferragens" },
      { property: "og:description", content: "Calcule quantidades e totais e envie seu orçamento pelo WhatsApp." },
    ],
  }),
  component: Orcamento,
});

const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100, "Nome muito longo"),
  phone: z.string().trim().refine((v) => { const d = v.replace(/\D/g, ""); return d.length >= 10 && d.length <= 13; }, "Telefone com DDD inválido"),
  address: z.string().trim().max(300, "Endereço muito longo"),
});

function Orcamento() {
  const cart = useCart();
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "address", string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedQuote | null>(null);
  const [waOpened, setWaOpened] = useState(false);

  const rows = cart.lines
    .map((l) => ({ line: l, p: products.find((p) => p.id === l.product_id && p.active) }))
    .filter((r): r is { line: typeof r.line; p: NonNullable<typeof r.p> } => !!r.p);
  const total = round2(rows.reduce((s, r) => s + round2(r.p.price * r.line.quantity), 0));

  async function finalize() {
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    if (rows.some((r) => !(r.line.quantity > 0))) { toast.error("Revise as quantidades."); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_quote", {
      _name: parsed.data.name,
      _phone: parsed.data.phone,
      _address: parsed.data.address,
      _items: rows.map((r) => ({ product_id: r.p.id, quantity: r.line.quantity })),
    });
    setSaving(false);
    if (error || !data) { toast.error(error?.message || "Não foi possível salvar o orçamento."); return; }
    setSaved(data as unknown as SavedQuote);
    cart.clear();
    toast.success("Orçamento registrado!");
  }

  if (saved) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-lg border bg-card p-6 shadow-card">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-success" />
              <div>
                <h1 className="text-3xl font-extrabold uppercase text-primary">Orçamento {saved.code}</h1>
                <p className="text-sm text-muted-foreground">Registrado em {formatDateTime(saved.created_at)} · {saved.customer_name}</p>
              </div>
            </div>
            <QuoteTable items={saved.items} total={Number(saved.total)} />
            {saved.delivery_address && <p className="mt-3 text-sm"><b>Entrega:</b> {saved.delivery_address}</p>}
            <p className="mt-4 text-xs text-muted-foreground">{DISCLAIMER}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button size="lg" onClick={() => downloadQuotePdf(saved, settings).catch(() => toast.error("Falha ao gerar o PDF."))}>
                <FileDown /> Baixar orçamento em PDF
              </Button>
              <Button
                size="lg"
                variant="whatsapp"
                disabled={!settings?.whatsapp}
                onClick={() => {
                  if (!settings?.whatsapp) return;
                  window.open(whatsappUrl(settings.whatsapp, whatsappMessage(saved)), "_blank", "noopener");
                  setWaOpened(true);
                }}
              >
                <MessageCircle /> Enviar orçamento pelo WhatsApp
              </Button>
            </div>
            {!settings?.whatsapp && (
              <p className="mt-3 text-sm text-destructive">O número de WhatsApp da loja ainda não foi configurado. Baixe o PDF e entre em contato com a loja.</p>
            )}
            {waOpened && (
              <p className="mt-4 flex gap-2 rounded bg-warning p-3 text-sm text-warning-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>O WhatsApp foi aberto com a mensagem pronta. <b>A mensagem só será enviada quando você tocar em “Enviar” no aplicativo.</b> Confira lá se o envio foi concluído.</span>
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline"><Link to="/catalogo">Fazer novo orçamento</Link></Button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="bg-steel">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-5xl font-extrabold uppercase text-steel-foreground">Meu orçamento</h1>
          <p className="mt-2 text-steel-foreground/70">Ajuste as quantidades e informe seus dados para finalizar.</p>
        </div>
      </section>
      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <Button asChild variant="ghost" className="mb-4 -ml-3"><Link to="/catalogo"><ArrowLeft /> Continuar escolhendo produtos</Link></Button>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-10 text-center">
              <p className="text-lg font-semibold text-primary">Seu orçamento está vazio.</p>
              <Button asChild variant="accent" className="mt-4"><Link to="/catalogo">Ver catálogo</Link></Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map(({ line, p }) => {
                const sub = round2(p.price * line.quantity);
                return (
                  <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 shadow-card sm:p-4 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3">
                      {p.image && <img src={p.image} alt="" className="h-16 w-16 rounded object-cover" />}
                      <div>
                        <p className="font-bold text-primary">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{formatBRL(p.price)} / {p.unit}</p>
                        {p.is_demo && <DemoBadge />}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:justify-end">
                      <div className="flex items-center">
                        <Button variant="outline" size="icon" aria-label="Diminuir" onClick={() => cart.setQty(p.id, Math.max(1, round2(line.quantity - 1)))}><Minus /></Button>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          step="any"
                          aria-label={`Quantidade de ${p.name}`}
                          value={Number.isFinite(line.quantity) ? line.quantity : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value.replace(",", "."));
                            cart.setQty(p.id, Number.isFinite(v) ? Math.min(Math.max(v, 0), 100000) : NaN);
                          }}
                          className="mx-1 h-9 w-20 text-center"
                        />
                        <Button variant="outline" size="icon" aria-label="Aumentar" onClick={() => cart.setQty(p.id, round2((line.quantity || 0) + 1))}><Plus /></Button>
                      </div>
                      <span className="w-14 text-xs text-muted-foreground">{p.unit}</span>
                      <span className="w-24 text-right font-bold">{formatBRL(sub)}</span>
                      <Button variant="ghost" size="icon" aria-label={`Remover ${p.name}`} onClick={() => cart.remove(p.id)}><Trash2 className="text-destructive" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="h-fit rounded-lg border bg-card p-5 shadow-card lg:sticky lg:top-24">
          <h2 className="text-2xl font-extrabold uppercase text-primary">Resumo</h2>
          <QuoteTable compact items={rows.map(({ line, p }) => ({ product_name: p.name, unit: p.unit, unit_price: p.price, quantity: line.quantity || 0, subtotal: round2(p.price * (line.quantity || 0)) }))} total={total} />
          <p className="mt-2 text-xs text-muted-foreground">Frete não incluído — condições de entrega confirmadas pela loja.</p>
          <div className="mt-5 space-y-3">
            <Field label="Seu nome *" error={errors.name}>
              <Input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label="Telefone com DDD *" error={errors.phone}>
              <Input value={form.phone} maxLength={20} inputMode="tel" placeholder="(00) 00000-0000" onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            </Field>
            <Field label="Endereço de entrega (opcional)" error={errors.address}>
              <Textarea value={form.address} maxLength={300} rows={2} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Button variant="accent" size="lg" className="w-full" disabled={rows.length === 0 || saving} onClick={finalize}>
              {saving && <Loader2 className="animate-spin" />} Finalizar orçamento
            </Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

