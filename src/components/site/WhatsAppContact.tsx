import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/store";
import { whatsappUrl } from "@/lib/quote-output";

export function WhatsAppContact({ className = "" }: { className?: string }) {
  const { data } = useQuery(settingsQuery);
  if (!data?.whatsapp)
    return (
      <Button variant="whatsapp" size="lg" disabled className={className} title="Número ainda não configurado pela loja">
        <MessageCircle /> WhatsApp
      </Button>
    );
  return (
    <Button asChild variant="whatsapp" size="lg" className={className}>
      <a href={whatsappUrl(data.whatsapp, "Olá! Vim pelo CATÁLOGO ONLINE e gostaria de atendimento.")} target="_blank" rel="noopener noreferrer">
        <MessageCircle /> Falar no WhatsApp
      </a>
    </Button>
  );
}

