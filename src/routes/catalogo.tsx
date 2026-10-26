import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { CartTotalBar } from "@/components/site/CartTotalBar";
import { PageShell } from "@/components/site/PageShell";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";
import { categoriesQuery, productsQuery } from "@/lib/store";

export const Route = createFileRoute("/catalogo")({
  validateSearch: z.object({ categoria: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Catálogo de cimentos e ferragens" },
      { name: "description", content: "Veja cimentos, vergalhões, arames, pregos, treliças e mais. Adicione ao orçamento online." },
      { property: "og:title", content: "Catálogo de cimentos e ferragens" },
      { property: "og:description", content: "Produtos para construção com preço por unidade de venda e orçamento online." },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { categoria } = Route.useSearch();
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [q, setQ] = useState("");
  const cats = categories.filter((c) => c.active);
  const current = cats.find((c) => c.slug === categoria);
  const list = products.filter(
    (p) =>
      p.active &&
      (!current || p.category_id === current.id) &&
      p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <PageShell>
      <section className="bg-steel">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-5xl font-extrabold uppercase text-steel-foreground">Catálogo</h1>
          <p className="mt-2 text-steel-foreground/70">Adicione os produtos ao seu orçamento. Preços por unidade de venda.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-28">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link to="/catalogo" search={{}} className={`rounded px-4 py-2 text-sm font-semibold uppercase ${!current ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Todos</Link>
            {cats.map((c) => (
              <Link key={c.id} to="/catalogo" search={{ categoria: c.slug }} className={`rounded px-4 py-2 text-sm font-semibold uppercase ${current?.id === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {c.name}
              </Link>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="h-10 bg-card pl-9" />
          </div>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando produtos…</p>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          ```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
```
            {list.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <CartTotalBar />
    </PageShell>
  );
}
