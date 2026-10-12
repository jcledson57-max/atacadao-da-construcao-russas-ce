import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle } from "lucide-react";
import { Brand } from "./Brand";
import { settingsQuery } from "@/lib/store";
import { formatPhone } from "@/lib/format";

export function SiteFooter() {
  const { data } = useQuery(settingsQuery);
  return (
    <footer className="mt-16 bg-steel text-steel-foreground">
      <div className="hazard-stripe h-2" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <Brand light />
        <div className="space-y-2 text-sm text-steel-foreground/80">
          {data?.address && (
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" />{data.address}</p>
          )}
          {data?.whatsapp && (
            <p className="flex gap-2"><MessageCircle className="h-4 w-4 shrink-0" />{formatPhone(data.whatsapp.replace(/^55/, ""))}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link to="/catalogo" className="hover:text-accent">Catálogo</Link>
          <Link to="/orcamento" className="hover:text-accent">Montar orçamento</Link>
          <Link to="/admin" className="text-steel-foreground/50 hover:text-accent">Área administrativa</Link>
        </div>
      </div>
    </footer>
  );
}
