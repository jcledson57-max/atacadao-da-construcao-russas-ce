import { Check, ImageOff, Plus } from "lucide-react";
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
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card">
      <div className="relative aspect-square bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff /></div>
        )}
        {product.is_demo && <div className="absolute left-2 top-2"><DemoBadge /></div>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-lg font-bold leading-tight text-primary">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="font-display text-2xl font-bold text-foreground">{formatBRL(product.price)}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">por {product.unit}</p>
          </div>
          <Button
            variant="accent"
            size="sm"
            className="h-10"
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
