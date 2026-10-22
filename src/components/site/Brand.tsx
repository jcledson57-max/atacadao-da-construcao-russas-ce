import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HardHat } from "lucide-react";
import { settingsQuery } from "@/lib/store";

export function Brand({ light = false }: { light?: boolean }) {
  const { data } = useQuery(settingsQuery);
  const name = data?.store_name?.trim() || "Sua Loja";
  return (
    <Link to="/" className="flex items-center gap-2.5">
      {data?.logo ? (
        <img src={data.logo} alt={name} className="h-16 w-16 rounded object-contain" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded bg-accent text-accent-foreground">
          <HardHat className="h-6 w-6" />
        </span>
      )}
      <span className="leading-tight">
        <span
          className={`block font-display text-xl font-bold uppercase ${light ? "text-steel-foreground" : "text-primary"}`}
        >
          {name}
        </span>
        <span className={`block text-xs ${light ? "text-steel-foreground/70" : "text-muted-foreground"}`}>
          Cimentos & Ferragens
        </span>
      </span>
    </Link>
  );
}
