import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatDateTime, formatPhone, formatQty } from "./format";
import type { StoreSettings } from "./store";

export type SavedQuote = {
  id: string;
  code: string;
  created_at: string;
  total: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  items: { product_name: string; unit: string; unit_price: number; quantity: number; subtotal: number }[];
};

export const DISCLAIMER =
  "Orçamento sujeito à confirmação de disponibilidade dos produtos e das condições de entrega pela loja. Valores de frete não incluídos.";

async function toDataUrl(url: string): Promise<{ data: string; fmt: string } | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    return { data, fmt };
  } catch {
    return null;
  }
}

export async function downloadQuotePdf(q: SavedQuote, s: StoreSettings | undefined) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(28, 42, 74);
  doc.rect(0, 0, W, 32, "F");
  doc.setFillColor(242, 133, 30);
  doc.rect(0, 32, W, 2, "F");

  let x = 14;
  if (s?.logo) {
    const img = await toDataUrl(s.logo);
    if (img) {
      doc.addImage(img.data, img.fmt, 14, 6, 20, 20);
      x = 38;
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(s?.store_name || "Orçamento", x, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (s?.address) doc.text(s.address, x, 21, { maxWidth: W - x - 70 });
  if (s?.whatsapp) doc.text(`WhatsApp: ${formatPhone(s.whatsapp.replace(/^55/, ""))}`, x, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`ORÇAMENTO Nº ${q.code}`, W - 14, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(formatDateTime(q.created_at), W - 14, 21, { align: "right" });
  doc.text("Origem: CATÁLOGO ONLINE", W - 14, 26, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  let y = 44;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${q.customer_name}`, 14, (y += 6));
  doc.text(`Telefone: ${formatPhone(q.customer_phone)}`, 14, (y += 5));
  if (q.delivery_address) {
    const lines = doc.splitTextToSize(`Endereço de entrega: ${q.delivery_address}`, W - 28);
    doc.text(lines, 14, (y += 5));
    y += (lines.length - 1) * 5;
  }

  autoTable(doc, {
    startY: y + 6,
    head: [["Produto", "Qtd.", "Unidade", "Preço unit.", "Subtotal"]],
    body: q.items.map((i) => [
      i.product_name,
      formatQty(Number(i.quantity)),
      i.unit,
      formatBRL(Number(i.unit_price)),
      formatBRL(Number(i.subtotal)),
    ]),
    foot: [["", "", "", "TOTAL", formatBRL(Number(q.total))]],
    headStyles: { fillColor: [28, 42, 74] },
    footStyles: { fillColor: [242, 133, 30], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    styles: { fontSize: 9 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(doc.splitTextToSize(DISCLAIMER, W - 28), 14, endY);
  doc.save(`orcamento-${q.code}.pdf`);
}

export function whatsappMessage(q: SavedQuote) {
  const lines = [
    "*ORÇAMENTO - CATÁLOGO ONLINE*",
    `Referência: *${q.code}*`,
    `Cliente: ${q.customer_name}`,
    `Telefone: ${formatPhone(q.customer_phone)}`,
    "",
    ...q.items.map(
      (i) =>
        `• ${formatQty(Number(i.quantity))} ${i.unit} - ${i.product_name} (${formatBRL(Number(i.unit_price))}) = ${formatBRL(Number(i.subtotal))}`,
    ),
    "",
    `*Total: ${formatBRL(Number(q.total))}*`,
  ];
  if (q.delivery_address) lines.push(`Entrega: ${q.delivery_address}`);
  lines.push("", "Aguardo confirmação de disponibilidade e condições de entrega.");
  return lines.join("\n");
}

export function whatsappUrl(number: string, text: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
