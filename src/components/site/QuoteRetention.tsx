import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { QUOTE_DELETION_ENABLED, RETENTION_DAYS, retentionCutoff, type RetentionDays } from "@/lib/quote-retention";

export function QuoteRetention() {
  const [days, setDays] = useState<RetentionDays>(90);
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

  return (
    <section aria-labelledby="quote-retention-title" className="mb-8 border-b pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="quote-retention-title" className="text-xl font-bold text-primary">Gerenciamento de orçamentos antigos</h2>
        <Button variant="outline" size="sm" onClick={() => counts.refetch()} disabled={counts.isFetching}>
          <RefreshCw className={counts.isFetching ? "animate-spin" : ""} /> Atualizar contagens
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quote-retention-days">Período de retenção</Label>
          <Select value={String(days)} onValueChange={(value) => {
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={!QUOTE_DELETION_ENABLED}><LockKeyhole /> Exclusão bloqueada</Button>
        <p className="max-w-xl text-sm text-muted-foreground">Nenhum registro será apagado nesta etapa. Qualquer exclusão futura exigirá confirmação expressa do administrador.</p>
      </div>
    </section>
  );
}