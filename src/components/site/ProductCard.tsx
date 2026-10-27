
import { Check, ImageOff, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/store";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export function DemoBadge() {
  return (
    <span className="rounded bg-warning px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning-foreground">
      Demonstração · preço fictício
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add, lines, setQty, remove } = useCart();
  const [added, setAdded] = useState(false);
  const qty = lines.find((l) => l.product_id === product.id)?.quantity ?? 0;
  const inCart = qty > 0;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-colors ${inCart ? "border-accent ring-2 ring-accent/40" : ""}`}>
      <div className="relative aspect-square bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff />
          </div>
        )}
        {product.is_demo && (
          <div className="absolute left-2 top-2">
            <DemoBadge />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-lg font-bold leading-tight text-primary">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-auto pt-3">
          <p className="font-display text-2xl font-bold text-foreground">
            {formatBRL(product.price)}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            por {product.unit}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {inCart && (
            <div
              className="flex h-10 shrink-0 items-center overflow-hidden rounded-md border-2 border-accent"
              aria-label={`Quantidade no orçamento: ${qty}`}
            >
              <button
                type="button"
                className="flex h-full w-8 items-center justify-center text-primary hover:bg-muted"
                aria-label="Diminuir quantidade"
                onClick={() =>
                  qty <= 1
                    ? remove(product.id)
                    : setQty(product.id, qty - 1)
                }
              >
                <Minus className="h-4 w-4" />
              </button>
              <span
                className="min-w-8 px-1 text-center font-display text-lg font-bold text-primary"
                aria-live="polite"
              >
                {qty}
              </span>
            </div>
          )}

          <Button
            variant="accent"
            size="sm"
            className="h-10 min-w-0 flex-1 px-2 text-sm"
            onClick={() => {
              add(product.id);
              setAdded(true);
              toast.success(`${product.name} adicionado ao orçamento`);
              setTimeout(() => setAdded(false), 1200);
            }}
          >
            {added ? <Check /> : <Plus />} Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
