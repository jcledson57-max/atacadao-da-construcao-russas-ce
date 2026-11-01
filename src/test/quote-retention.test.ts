import { describe, expect, it } from "vitest";
import { QUOTE_DELETION_ENABLED, RETENTION_DAYS, retentionCutoff } from "@/lib/quote-retention";

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
  it("keeps deletion disabled during this read-only stage", () => {
    expect(QUOTE_DELETION_ENABLED).toBe(false);
  });
});