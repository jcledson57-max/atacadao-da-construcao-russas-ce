import { describe, expect, it } from "vitest";
import { canConfirmCleanup, quoteBackupCsv, RETENTION_DAYS, retentionCutoff } from "@/lib/quote-retention";

describe("Quote retention safety", () => {
  it("offers exactly the five requested retention periods", () => {
    expect(RETENTION_DAYS).toEqual([30, 60, 90, 180, 365]);
  });
  it.each([
    [30, "2026-10-02T12:00:00.000Z"],
    [60, "2026-09-02T12:00:00.000Z"],
    [90, "2026-08-03T12:00:00.000Z"],
    [180, "2026-05-05T12:00:00.000Z"],
    [365, "2025-11-01T12:00:00.000Z"],
  ] as const)("computes the strict older-than boundary for %i days", (days, expected) => {
    expect(retentionCutoff(days, new Date("2026-11-01T12:00:00Z"))).toBe(expected);
  });
  it("requires explicit second confirmation and a positive count", () => {
    expect(canConfirmCleanup(false, 3, false)).toBe(false);
    expect(canConfirmCleanup(true, 0, false)).toBe(false);
    expect(canConfirmCleanup(true, 3, true)).toBe(false);
    expect(canConfirmCleanup(true, 3, false)).toBe(true);
  });
  it("exports quote details and every item with quantities and snapshotted prices", () => {
    const csv = quoteBackupCsv([{ code: "ORC-1", created_at: "2026-01-01", customer_name: "Maria", customer_phone: "88999999999", delivery_address: "Rua 1", total: 30, quote_items: [{ product_name: "Cimento", unit: "saco", quantity: 2, unit_price: 10, subtotal: 20 }, { product_name: "Arame", unit: "quilo", quantity: 1, unit_price: 10, subtotal: 10 }] }]);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).toContain('"ORC-1";"2026-01-01";"Maria";"88999999999";"Rua 1";"30";"Cimento";"saco";"2";"10";"20"');
    expect(csv).toContain('"Arame";"quilo";"1";"10";"10"');
  });
  it("escapes spreadsheet formulas in user data", () => {
    const csv = quoteBackupCsv([{ code: "ORC-2", created_at: "2026-01-01", customer_name: "=1+1", customer_phone: "88", delivery_address: null, total: 0, quote_items: [] }]);
    expect(csv).toContain('"\'=1+1"');
  });
});