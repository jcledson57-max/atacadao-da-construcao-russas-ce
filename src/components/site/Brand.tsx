
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HardHat } from "lucide-react";
import { settingsQuery } from "@/lib/store";
import logoAtacadao from "@/ativos/atacadaologo.jpeg";

export function Brand({ light = false }: { light?: boolean }) {
  const { data } = useQuery(settingsQuery);
  const name = data?.store_name?.trim() || "Atacadão da Construção";

  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img
        src={logoAtacadao}
        alt={name}
        className="h-20 w-20 rounded object-contain"
      />

      <span className="leading-tight">
        <span
          className={`block font-display text-xl font-bold uppercase ${
            light ? "text-steel-foreground" : "text-primary"
          }`}
        >
          {name}
        </span>

        <span
          className={`block text-xs ${
            light
              ? "text-steel-foreground/70"
              : "text-muted-foreground"
          }`}
        >
          Cimentos & Ferragens
        </span>
      </span>
    </Link>
  );
}
