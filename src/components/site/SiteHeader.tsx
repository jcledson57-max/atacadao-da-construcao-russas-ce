import { Link } from "@tanstack/react-router";
import { ClipboardList, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/orcamento", label: "Orçamento" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="hazard-stripe h-1.5" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary data-[status=active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="accent" size="sm" className="h-10">
            <Link to="/orcamento" aria-label="Meu orçamento">
              <ClipboardList />
              <span className="hidden sm:inline">Orçamento</span>
              <span className="rounded-full bg-steel px-2 py-0.5 text-xs text-steel-foreground">{count}</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-3 font-semibold uppercase tracking-wide text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
