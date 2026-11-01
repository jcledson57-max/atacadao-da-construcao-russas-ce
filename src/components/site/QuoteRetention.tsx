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
      if (total.count === null || older.count === null) throw new Error("Contagens indisponíveis.");
      return { total: total.count, older: older.count, cutoff };
    },
  });

  const available = !counts.isFetching && !counts.isError && (counts.data?.older ?? 0) > 0 && !busy && !exporting;

  async function exportBackup() {
    if (!available || !counts.data) return;
    const { cutoff, older } = counts.data;
    setExporting(true);
    try {
      const quotes: BackupQuote[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("quotes")
          .select("code, created_at, customer_name, customer_phone, delivery_address, total, quote_items(product_name, unit, quantity, unit_price, subtotal)")
          .lt("created_at", cutoff).order("created_at").order("id").range(offset, offset + 499);
        if (error) throw error;
        quotes.push(...data);
        if (data.length < 500) break;
      }
      if (quotes.length !== older) throw new Error("A quantidade mudou. Atualize as contagens antes do backup.");
      const url = URL.createObjectURL(new Blob([quoteBackupCsv(quotes)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-orcamentos-${days}-dias-${cutoff.slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success(`Backup preparado com ${quotes.length} orçamentos.`);
    } catch (error) { toast.error((error as Error).message); }
    finally { setExporting(false); }
  }

  async function deleteConfirmed() {
    if (!review || !canConfirmCleanup(confirmed, review.count, busy)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("delete_old_quotes", {
        _days: review.days, _cutoff: review.cutoff, _expected_count: review.count, _confirmed: true,
      });
      if (error) throw error;
      const removed = typeof data === "object" && data !== null && "deleted_count" in data ? Number(data.deleted_count) : review.count;
      toast.success(`${removed} orçamentos removidos. Operação registrada no histórico.`);
      setReview(null);
      setConfirmed(false);
    } catch (error) {
      toast.error((error as Error).message);
      setReview(null);
      setConfirmed(false);
    } finally {
      await Promise.all([qc.invalidateQueries({ queryKey: ["quotes"] }), qc.invalidateQueries({ queryKey: ["quote-cleanup-history"] })]);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="quote-retention-title" className="mb-8 border-b pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="quote-retention-title" className="text-xl font-bold text-primary">Gerenciamento de orçamentos antigos</h2>
        <Button variant="outline" size="sm" onClick={() => counts.refetch()} disabled={counts.isFetching || busy || exporting}>
          <RefreshCw className={counts.isFetching ? "animate-spin" : ""} /> Atualizar contagens
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quote-retention-days">Período de retenção</Label>
          <Select disabled={busy || exporting} value={String(days)} onValueChange={(value) => {
            const selected = RETENTION_DAYS.find((option) => String(option) === value);
            if (selected !== undefined) setDays(selected);
          }}>
            <SelectTrigger id="quote-retention-days"><SelectValue /></SelectTrigger>
            <SelectContent>{RETENTION_DAYS.map((option) => <SelectItem key={option} value={String(option)}>{option} dias</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total de orçamentos</p>
          <p className="mt-1 text-3xl font-bold text-primary" aria-live="polite">{counts.isFetching || counts.isError ? "—" : counts.data?.total ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Mais antigos que {days} dias</p>
          <p className="mt-1 text-3xl font-bold text-primary" aria-live="polite">{counts.isFetching || counts.isError ? "—" : counts.data?.older ?? "—"}</p>
        </div>
      </div>
      {counts.isError && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível consultar as contagens. Tente atualizar novamente.</p>}
      {counts.data && !counts.isFetching && !counts.isError && <p className="mt-3 text-xs text-muted-foreground">Orçamentos criados antes de {new Date(counts.data.cutoff).toLocaleString("pt-BR")} se enquadram no período. As contagens incluem todos os registros, não apenas a lista abaixo.</p>}
      {counts.data && !counts.isFetching && !counts.isError && (
        <div role="status" className={counts.data.older > 0 ? "mt-4 border-l-4 border-accent bg-accent/15 p-4 text-foreground" : "mt-4 border-l-4 border-primary bg-muted p-4 text-foreground"}>
          {counts.data.older > 0 ? <><strong>{counts.data.older} orçamentos antigos encontrados.</strong> Deseja realizar a limpeza ou exportar um backup?</> : <strong>Não há orçamentos antigos para o período de {days} dias.</strong>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={!available} onClick={exportBackup}><Download /> {exporting ? "Preparando backup…" : "Exportar Backup CSV"}</Button>
        <Button variant="destructive" disabled={!available} onClick={() => {
          if (!counts.data) return;
          setConfirmed(false);
          setReview({ days, cutoff: counts.data.cutoff, count: counts.data.older });
        }}><Trash2 /> Excluir orçamentos antigos</Button>
      </div>
      <h3 className="mt-6 mb-3 font-bold text-primary">Últimas exclusões</h3>
      {history.isPending ? <p className="text-sm text-muted-foreground">Carregando histórico…</p> : history.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar o histórico.</p> : !history.data?.length ? <p className="text-sm text-muted-foreground">Nenhuma exclusão registrada.</p> : (
        <ul className="divide-y text-sm">{history.data.map((entry) => <li key={entry.id} className="py-3">
          <p className="font-semibold">{entry.deleted_count} orçamentos excluídos · retenção de {entry.retention_days} dias</p>
          <p className="break-words text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")} · {entry.admin_email}</p>
          <p className="text-muted-foreground">Corte: {new Date(entry.cutoff_at).toLocaleString("pt-BR")}</p>
        </li>)}</ul>
      )}
      <Dialog open={!!review} onOpenChange={(open) => { if (!open && !busy) { setReview(null); setConfirmed(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de orçamentos antigos</DialogTitle>
            <DialogDescription>Esta ação é permanente. Faça o backup antes de continuar.</DialogDescription>
          </DialogHeader>
          {review && <>
            <p><strong>{review.count} orçamentos</strong> criados antes de <strong>{new Date(review.cutoff).toLocaleString("pt-BR")}</strong> serão apagados, incluindo seus itens. Retenção: {review.days} dias.</p>
            <p className="text-sm text-muted-foreground">Produtos, categorias e configurações da loja não serão alterados.</p>
            <div className="flex items-start gap-3">
              <Checkbox id="confirm-quote-cleanup" disabled={busy} checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <Label htmlFor="confirm-quote-cleanup" className="leading-relaxed">Confirmo expressamente a exclusão permanente destes {review.count} orçamentos.</Label>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => { setReview(null); setConfirmed(false); }}>Cancelar</Button>
              <Button variant="destructive" disabled={!canConfirmCleanup(confirmed, review.count, busy)} onClick={deleteConfirmed}>{busy ? "Excluindo…" : "Excluir agora"}</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}