import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { useCartTotal } from "@/lib/useCartTotal";

/** Barra fixa no rodapé mostrando o total do orçamento em tempo real. */
export function CartTotalBar() {
  const { count, total } = useCartTotal();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
            {count} {count === 1 ? "item no orçamento" : "itens no orçamento"}
          </p>
          <p className="font-display text-2xl font-bold leading-tight text-primary" aria-live="polite">
            {formatBRL(total)}
          </p>
        </div>
        <Button asChild variant="accent" size="lg">
          <Link to="/orcamento">
            <ClipboardList /> Ver orçamento
          </Link>
        </Button>
      </div>
    </div>
  );
}
