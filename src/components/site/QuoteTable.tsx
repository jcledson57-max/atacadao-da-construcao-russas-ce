import { formatBRL, formatQty } from "@/lib/format";
import type { SavedQuote } from "@/lib/quote-output";

export function QuoteTable({ items, total, compact }: { items: SavedQuote["items"]; total: number; compact?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Produto</th>
            <th className="py-2 text-right">Qtd.</th>
            {!compact && <th className="py-2 text-right">Unit.</th>}
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="border-b">
              <td className="py-2 pr-2">{i.product_name}</td>
              <td className="whitespace-nowrap py-2 text-right">{formatQty(Number(i.quantity))} {i.unit}</td>
              {!compact && <td className="whitespace-nowrap py-2 text-right">{formatBRL(Number(i.unit_price))}</td>}
              <td className="whitespace-nowrap py-2 text-right font-semibold">{formatBRL(Number(i.subtotal))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={compact ? 2 : 3} className="pt-3 font-display text-lg font-bold uppercase">Total</td>
            <td className="pt-3 text-right font-display text-2xl font-bold text-primary" data-testid="total">{formatBRL(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
