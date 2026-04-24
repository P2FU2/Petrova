import { NextResponse } from "next/server";
import { categoryBreakdown, summarizeTransactions } from "@/lib/analytics";
import { listTransactions } from "@/lib/store";

function toCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function GET() {
  const txs = listTransactions();
  const summary = summarizeTransactions(txs);
  const categories = categoryBreakdown(txs);

  const csv = toCsv(
    txs.map((tx) => ({
      date: tx.date,
      description: tx.descriptionClean,
      amount: tx.amount,
      direction: tx.direction,
      category: tx.category
    }))
  );

  return NextResponse.json({
    summary,
    categories,
    report: {
      generatedAt: new Date().toISOString(),
      transactionsCsv: csv
    }
  });
}
