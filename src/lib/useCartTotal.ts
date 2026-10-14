import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { productsQuery } from "@/lib/store";
import { round2 } from "@/lib/format";

/** Total em tempo real do orçamento (itens válidos e ativos). */
export function useCartTotal() {
  const { lines, count } = useCart();
  const { data: products = [] } = useQuery(productsQuery);
  const total = round2(
    lines.reduce((sum, l) => {
      const p = products.find((p) => p.id === l.product_id && p.active);
      return p && l.quantity > 0 ? sum + round2(p.price * l.quantity) : sum;
    }, 0),
  );
  return { count, total };
}
