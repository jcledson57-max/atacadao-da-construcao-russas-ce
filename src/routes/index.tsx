import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, FileDown, ShieldCheck, Truck } from "lucide-react";
import hero from "@/ativos/marca.png";
import { PageShell } from "@/components/site/PageShell";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { categoriesQuery, productsQuery } from "@/lib/store";
import { WhatsAppContact } from "@/components/site/WhatsAppContact";
import { CartTotalBar } from "@/components/site/CartTotalBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cimentos e Ferragens | Catálogo e orçamento online" },
      { name: "description", content: "Cimentos, vergalhões, arames, pregos e treliças. Monte seu orçamento online e envie pelo WhatsApp." },
      { property: "og:title", content: "Cimentos e Ferragens | Catálogo e orçamento online" },
      { property: "og:description", content: "Monte seu orçamento de cimentos e ferragens online, baixe em PDF e envie pelo WhatsApp." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const active = products.filter((p) => p.active);
  const featured = categories
    .filter((c) => c.active)
    .map((c) => ({ c, items: active.filter((p) => p.category_id === c.id) }));

  return (
  <PageShell>
    <section className="relative overflow-hidden bg-steel">
      <img
        src={hero}
        alt="Sacos de cimento e vergalhões em depósito"
        width={1600}
        height={912}
        className="absolute inset-0 h-full w-full object-cover object-[65%_center] md:object-center"
      />
      <div className="hero-overlay absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20 md:py-32">
        <p className="mb-4 inline-block rounded bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
          Cimentos & Ferragens
        </p>
          <h1 className="max-w-full text-3xl font-extrabold uppercase leading-tight text-steel-foreground sm:max-w-2xl sm:text-5xl md:text-7xl">
            Qualidade para construir. <span className="text-accent">Economia para realizar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-steel-foreground/80">
            Escolha os produtos, monte seu orçamento em minutos, baixe em PDF e envie direto para a loja pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link to="/catalogo">Ver catálogo <ArrowRight /></Link>
            </Button>
            <Button asChild variant="heroOutline" size="lg">
              <Link to="/orcamento"><ClipboardList /> Montar meu orçamento</Link>
            </Button>
            <WhatsAppContact />
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-3">
          {[
            { icon: ClipboardList, t: "Orçamento na hora", d: "Totais calculados automaticamente" },
            { icon: FileDown, t: "PDF para baixar", d: "Guarde ou compartilhe seu orçamento" },
            { icon: Truck, t: "Entrega a combinar", d: "Condições confirmadas pela loja" },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground"><I className="h-5 w-5" /></span>
              <div><p className="font-display text-lg font-bold uppercase text-primary">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {active.some((p) => p.is_demo) && (
        <div className="mx-auto mt-8 max-w-6xl px-4">
          <p className="flex items-center gap-2 rounded border border-warning-foreground/20 bg-warning px-4 py-3 text-sm text-warning-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Produtos marcados como “Demonstração” têm preços fictícios, apenas para teste. Não são preços comerciais.
          </p>
        </div>
      )}

      {featured.map(({ c, items }) => (
        <section key={c.id} className="mx-auto max-w-6xl px-4 pt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 h-1 w-12 bg-accent" />
              <h2 className="text-4xl font-extrabold uppercase text-primary">{c.name}</h2>
            </div>
            <Link to="/catalogo" search={{ categoria: c.slug }} className="text-sm font-semibold uppercase text-accent-foreground hover:underline">
              Ver todos →
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="text-muted-foreground">Nenhum produto cadastrado nesta categoria.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      ))}
      <div className="h-28" aria-hidden />
      <CartTotalBar />
    </PageShell>
  );
}
