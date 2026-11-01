export const RETENTION_DAYS = [30, 60, 90, 180, 365] as const;
export type RetentionDays = (typeof RETENTION_DAYS)[number];

// This stage is strictly read-only, even if an administrator confirms.
export const QUOTE_DELETION_ENABLED = false;

export function retentionCutoff(days: RetentionDays, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}