export const RETENTION_DAYS = [30, 60, 90, 180, 365] as const;
export type RetentionDays = (typeof RETENTION_DAYS)[number];

export function canConfirmCleanup(confirmed: boolean, count: number, busy: boolean): boolean {
  return confirmed && count > 0 && !busy;
}

type BackupItem = { product_name: string; unit: string; quantity: number; unit_price: number; subtotal: number };
export type BackupQuote = { code: string; created_at: string; customer_name: string; customer_phone: string; delivery_address: string | null; total: number; quote_items: BackupItem[] };

export function quoteBackupCsv(quotes: BackupQuote[]): string {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    // Prevent customer-provided spreadsheet formulas without modifying numbers.
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows: unknown[][] = [["Código", "Data", "Cliente", "Telefone", "Endereço", "Total orçamento", "Produto", "Unidade", "Quantidade", "Preço unitário", "Subtotal"]];
  for (const quote of quotes) {
    const base = [quote.code, quote.created_at, quote.customer_name, quote.customer_phone, quote.delivery_address, quote.total];
    if (!quote.quote_items.length) rows.push([...base, "", "", "", "", ""]);
    for (const item of quote.quote_items) rows.push([...base, item.product_name, item.unit, item.quantity, item.unit_price, item.subtotal]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

export function retentionCutoff(days: RetentionDays, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}