import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = { product_id: string; quantity: number };

type CartCtx = {
  lines: CartLine[];
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "orcamento-carrinho-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.length,
      add: (id, qty = 1) =>
        setLines((ls) =>
          ls.some((l) => l.product_id === id)
            ? ls.map((l) => (l.product_id === id ? { ...l, quantity: l.quantity + qty } : l))
            : [...ls, { product_id: id, quantity: qty }],
        ),
      setQty: (id, qty) =>
        setLines((ls) => ls.map((l) => (l.product_id === id ? { ...l, quantity: qty } : l))),
      remove: (id) => setLines((ls) => ls.filter((l) => l.product_id !== id)),
      clear: () => setLines([]),
    }),
    [lines],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}
