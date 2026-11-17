
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { canConfirmCleanup, quoteBackupCsv, RETENTION_DAYS, retentionCutoff, type BackupQuote, type RetentionDays } from "@/lib/quote-retention";

export function QuoteRetention() {
  const [days, setDays] = useState<RetentionDays>(90);
  const qc = useQueryClient();
  const [review, setReview] = useState<{ days: RetentionDays; cutoff: string; count: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const history = useQuery({
    queryKey: ["quote-cleanup-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("quote_cleanup_history_recent");
      if (error) throw error;
      return data;
    },
  });

  const counts = useQuery({
    queryKey: ["quotes", "retention", days],
    queryFn: async () => {
      const cutoff = retentionCutoff(days);
      const [total, older] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }).lt("created_at", cutoff),
      ]);
      if (total.error) throw total.error;
      if (older.error) throw older.error;
      if (total.count === null || older.count === null) {
        throw new Error("Contagens indisponíveis.");
      }
      return { total: total.count, older: older.count, cutoff };
    },
  });

  const available =
    !counts.isFetching &&
    !counts.isError &&
    (counts.data?.older ?? 0) > 0 &&
    !busy &&
    !exporting;

  async function exportBackup() {
    if (!available || !counts.data) return;

    const { cutoff, older } = counts.data;
    setExporting(true);

    try {
      const quotes: BackupQuote[] = [];

      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("quotes")
          .select("code, created_at, customer_name, customer_phone, delivery_address, total, quote_items(product_name, unit, quantity, unit_price, subtotal)")
          .lt("created_at", cutoff)
          .order("created_at")
          .order("id")
          .range(offset, offset + 499);

        if (error) throw error;

        quotes.push(...data);
        if (data.length < 500) break;
      }

      if (quotes.length !== older) {
        throw new Error("A quantidade mudou. Atualize as contagens antes do backup.");
      }

      const url = URL.createObjectURL(
        new Blob([quoteBackupCsv(quotes)], { type: "text/csv;charset=utf-8" }),
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-orcamentos-${days}-dias-${cutoff.slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success(`Backup preparado com ${quotes.length} orçamentos.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteConfirmed() {
    if (!review || !canConfirmCleanup(confirmed, review.count, busy)) return;

    setBusy(true);

    try {
      const { data, error } = await supabase.rpc("delete_old_quotes", {
        _days: review.days,
        _cutoff: review.cutoff,
        _expected_count: review.count,
        _confirmed: true,
      });

      if (error) throw error;

      const removed =
        typeof data === "object" && data !== null && "deleted_count" in data
          ? Number(data["deleted_count"])
          : review.count;

      toast.success(`${removed} orçamentos removidos. Operação registrada no histórico.`);
      setReview(null);
      setConfirmed(false);
    } catch (error) {
      toast.error((error as Error).message);
      setReview(null);
      setConfirmed(false);
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["quotes"] }),
        qc.invalidateQueries({ queryKey: ["quote-cleanup-history"] }),
      ]);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="quote-retention-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="quote-retention-title" className="text-base font-bold leading-tight text-primary">
          Gerenciar orçamentos antigos
        </h2>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Atualizar contagens"
          aria-label="Atualizar contagens"
          onClick={() => counts.refetch()}
          disabled={counts.isFetching || busy || exporting}
        >
          <RefreshCw className={counts.isFetching ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="space-y-3 rounded-md bg-muted/50 p-3">
        <div className="space-y-1">
          <Label htmlFor="quote-retention-days" className="text-xs">
            Período de retenção
          </Label>

          <Select
            disabled={busy || exporting}
            value={String(days)}
            onValueChange={(value) => {
              const selected = RETENTION_DAYS.find((option) => String(option) === value);
              if (selected !== undefined) setDays(selected);
            }}
          >
            <SelectTrigger id="quote-retention-days" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_DAYS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total de orçamentos</p>
            <p className="text-2xl font-bold text-primary" aria-live="polite">
              {counts.isFetching || counts.isError ? "—" : counts.data?.total ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Antigos ({days} dias)</p>
            <p className="text-2xl font-bold text-primary" aria-live="polite">
              {counts.isFetching || counts.isError ? "—" : counts.data?.older ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {counts.isError && (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível consultar as contagens. Tente atualizar.
        </p>
      )}

      {counts.data && !counts.isFetching && !counts.isError && (
        <>
          <p className="text-xs text-muted-foreground">
            Corte: {new Date(counts.data.cutoff).toLocaleDateString("pt-BR")}
          </p>

          <div
            role="status"
            className={
              counts.data.older > 0
                ? "rounded-md border-l-4 border-accent bg-accent/15 p-3 text-xs"
                : "rounded-md border-l-4 border-primary bg-muted p-3 text-xs"
            }
          >
            {counts.data.older > 0 ? (
              <strong>{counts.data.older} orçamentos antigos encontrados.</strong>
            ) : (
              <strong>Não há orçamentos antigos para este período.</strong>
            )}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={!available}
          onClick={exportBackup}
        >
          <Download />
          {exporting ? "Preparando backup…" : "Exportar Backup CSV"}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={!available}
          onClick={() => {
            if (!counts.data) return;
            setConfirmed(false);
            setReview({
              days,
              cutoff: counts.data.cutoff,
              count: counts.data.older,
            });
          }}
        >
          <Trash2 /> Excluir orçamentos antigos
        </Button>
      </div>

      <div className="border-t pt-3">
        <h3 className="mb-2 text-sm font-bold text-primary">Últimas exclusões</h3>

        {history.isPending ? (
          <p className="text-xs text-muted-foreground">Carregando histórico…</p>
        ) : history.isError ? (
          <p role="alert" className="text-xs text-destructive">
            Não foi possível consultar o histórico.
          </p>
        ) : !history.data?.length ? (
          <p className="text-xs text-muted-foreground">Nenhuma exclusão registrada.</p>
        ) : (
          <ul className="max-h-64 space-y-3 overflow-y-auto divide-y text-xs">
            {history.data.map((entry) => (
              <li key={entry.id} className="space-y-1 py-2">
                <p className="font-semibold">
                  {entry.deleted_count} orçamentos excluídos
                </p>
                <p className="text-muted-foreground">
                  Retenção de {entry.retention_days} dias
                </p>
                <p className="break-words text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="break-all text-muted-foreground">{entry.admin_email}</p>
                <p className="text-muted-foreground">
                  Corte: {new Date(entry.cutoff_at).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setReview(null);
            setConfirmed(false);
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de orçamentos antigos</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Faça o backup antes de continuar.
            </DialogDescription>
          </DialogHeader>

          {review && (
            <>
              <p>
                <strong>{review.count} orçamentos</strong> criados antes de{" "}
                <strong>{new Date(review.cutoff).toLocaleString("pt-BR")}</strong> serão apagados,
                incluindo seus itens. Retenção: {review.days} dias.
              </p>

              <p className="text-sm text-muted-foreground">
                Produtos, categorias e configurações da loja não serão alterados.
              </p>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirm-quote-cleanup"
                  disabled={busy}
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <Label htmlFor="confirm-quote-cleanup" className="leading-relaxed">
                  Confirmo expressamente a exclusão permanente destes {review.count} orçamentos.
                </Label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setReview(null);
                    setConfirmed(false);
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  variant="destructive"
                  disabled={!canConfirmCleanup(confirmed, review.count, busy)}
                  onClick={deleteConfirmed}
                >
                  {busy ? "Excluindo…" : "Excluir agora"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
