import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

type Sound = "off" | "bip" | "sino" | "alarme";
const SOUND_KEY = "admin-notif-sound";
const VOL_KEY = "admin-notif-volume";

export function playAlert(sound: Sound, volume: number) {
  if (sound === "off") return;
  try {
    const ctx = new AudioContext();
    const notes = sound === "bip" ? [880, 880] : sound === "sino" ? [1319, 988, 784] : [660, 990, 660, 990];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = sound === "alarme" ? "square" : "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(volume * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.21);
    });
  } catch { /* áudio indisponível */ }
}

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState<Sound>("sino");
  const [volume, setVolume] = useState(0.7);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const cfg = useRef({ sound, volume });
  cfg.current = { sound, volume };

  useEffect(() => {
    setSound((localStorage.getItem(SOUND_KEY) as Sound) || "sino");
    setVolume(Number(localStorage.getItem(VOL_KEY) ?? 0.7));
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const list = useQuery({
    queryKey: ["quote-notifications", userId],
    queryFn: async () => {
      const [q, r] = await Promise.all([
        supabase.from("quotes").select("id, code, customer_name, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("quote_reads").select("quote_id").eq("user_id", userId),
      ]);
      if (q.error) throw q.error;
      const read = new Set((r.data ?? []).map((x) => x.quote_id));
      return q.data.map((x) => ({ ...x, read: read.has(x.id) }));
    },
  });
  const items = list.data ?? [];
  const unread = items.filter((i) => !i.read).length;

  function openQuote(id: string) {
    markRead([id]);
    setOpen(false);
    navigate({ to: "/admin", search: { orcamento: id } });
  }
  const openRef = useRef(openQuote);
  openRef.current = openQuote;

  useEffect(() => {
    const ch = supabase
      .channel(`quotes-notif-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes" }, (p) => {
        const n = p.new as { id: string; code: string; customer_name: string; created_at: string };
        qc.invalidateQueries({ queryKey: ["quote-notifications"] });
        qc.invalidateQueries({ queryKey: ["quotes"] });
        playAlert(cfg.current.sound, cfg.current.volume);
        const body = `${n.customer_name} · ${n.code} · ${formatDateTime(n.created_at)}`;
        toast("Novo orçamento recebido", {
          description: body,
          duration: 15000,
          action: { label: "Abrir", onClick: () => openRef.current(n.id) },
        });
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          const notif = new Notification("Novo orçamento — Atacadão", { body, icon: `${import.meta.env.BASE_URL}icone.png`, tag: n.id });
          notif.onclick = () => { window.focus(); openRef.current(n.id); notif.close(); };
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function markRead(ids: string[]) {
    const rows = ids.filter((id) => items.find((i) => i.id === id && !i.read)).map((quote_id) => ({ quote_id, user_id: userId }));
    if (!rows.length) return;
    const { error } = await supabase.from("quote_reads").upsert(rows, { ignoreDuplicates: true });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["quote-notifications"] });
  }
  async function markUnread(id: string) {
    await supabase.from("quote_reads").delete().eq("quote_id", id).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["quote-notifications"] });
  }
  async function askPermission() {
    if (typeof Notification === "undefined") return;
    setPerm(await Notification.requestPermission());
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`Notificações: ${unread} não lidas`}>
          {unread ? <BellRing /> : <Bell />}
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-destructive px-1 text-center text-xs font-bold leading-5 text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="font-bold text-primary">Notificações</p>
          <Button size="sm" variant="ghost" disabled={!unread} onClick={() => markRead(items.map((i) => i.id))}><CheckCheck /> Marcar todas</Button>
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum orçamento recebido ainda.</li>}
          {items.map((i) => (
            <li key={i.id} className={`flex items-start gap-2 p-3 ${i.read ? "" : "bg-accent/10"}`}>
              <button className="flex-1 text-left" onClick={() => openQuote(i.id)}>
                <p className={`text-sm ${i.read ? "" : "font-bold"}`}>{i.customer_name}</p>
                <p className="text-xs text-muted-foreground"><span className="font-mono">{i.code}</span> · {formatDateTime(i.created_at)}</p>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={i.read ? "Marcar como não lida" : "Marcar como lida"}
                onClick={() => (i.read ? markUnread(i.id) : markRead([i.id]))}>
                {i.read ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t p-3 text-sm">
          <div className="flex items-center gap-2">
            {sound === "off" ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <select aria-label="Som do alerta" className="h-8 flex-1 rounded-md border border-input bg-background px-2" value={sound}
              onChange={(e) => { const v = e.target.value as Sound; setSound(v); localStorage.setItem(SOUND_KEY, v); playAlert(v, volume); }}>
              <option value="sino">Som: sino</option><option value="bip">Som: bip</option><option value="alarme">Som: alarme</option><option value="off">Sem som</option>
            </select>
            <input aria-label="Volume" type="range" min={0.1} max={1} step={0.1} value={volume} className="w-20"
              onChange={(e) => { const v = Number(e.target.value); setVolume(v); localStorage.setItem(VOL_KEY, String(v)); }} />
          </div>
          {perm === "default" && <Button size="sm" variant="accent" className="w-full" onClick={askPermission}>Ativar avisos do navegador</Button>}
          {perm === "denied" && <p className="text-xs text-muted-foreground">Avisos do navegador bloqueados. Libere nas configurações do navegador.</p>}
          {perm === "granted" && <p className="text-xs text-muted-foreground">Avisos do navegador ativos com o painel aberto (mesmo em segundo plano).</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
