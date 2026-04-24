import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { categoryBreakdown, summarizeTransactions } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { listTransactions } from "@/lib/repository";
import { generateMonthlyPdf } from "@/lib/report-pdf";

function toCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const txs = await listTransactions(context);
  const summary = summarizeTransactions(txs);
  const categories = categoryBreakdown(txs);
  const format = req.nextUrl.searchParams.get("format");

  const csv = toCsv(
    txs.map((tx) => ({
      date: tx.date,
      description: tx.descriptionClean,
      amount: tx.amount,
      direction: tx.direction,
      category: tx.category
    }))
  );

  if (format === "pdf") {
    const pdf = await generateMonthlyPdf(summary, txs);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-finance-os-${new Date().toISOString().slice(0, 10)}.pdf"`
      }
    });
  }

  return NextResponse.json({
    summary,
    categories,
    report: {
      generatedAt: new Date().toISOString(),
      transactionsCsv: csv
    }
  });
}
