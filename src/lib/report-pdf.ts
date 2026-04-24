import PDFDocument from "pdfkit";
import type { LedgerTransaction } from "@/lib/types";

export function generateMonthlyPdf(summary: { income: number; expense: number; net: number; totalTransactions: number }, transactions: LedgerTransaction[]) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(18).text("Petrova - Relatorio Mensal");
  doc.moveDown();
  doc.fontSize(11).text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown();
  doc.text(`Entradas: ${money(summary.income)}`);
  doc.text(`Saidas: ${money(summary.expense)}`);
  doc.text(`Saldo: ${money(summary.net)}`);
  doc.text(`Lancamentos: ${summary.totalTransactions}`);
  doc.moveDown();
  doc.fontSize(13).text("Transacoes");
  doc.moveDown(0.5);

  for (const tx of transactions.slice(0, 80)) {
    doc
      .fontSize(10)
      .text(
        `${new Date(tx.date).toLocaleDateString("pt-BR")} | ${tx.descriptionClean.slice(0, 40)} | ${tx.category} | ${tx.direction} | ${money(tx.amount)}`
      );
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
