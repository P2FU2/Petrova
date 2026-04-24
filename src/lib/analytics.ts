import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LedgerTransaction } from "@/lib/types";

export function summarizeTransactions(transactions: LedgerTransaction[]) {
  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.direction === "income") acc.income += tx.amount;
      if (tx.direction === "expense") acc.expense += tx.amount;
      if (tx.direction === "transfer") acc.transfers += tx.amount;
      return acc;
    },
    { income: 0, expense: 0, transfers: 0 }
  );

  return {
    ...totals,
    net: totals.income - totals.expense,
    totalTransactions: transactions.length
  };
}

export function categoryBreakdown(transactions: LedgerTransaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.direction !== "expense") continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function detectIncompletePeriod(transactions: LedgerTransaction[]) {
  if (transactions.length === 0) return null;
  const months = new Set(transactions.map((tx) => format(new Date(tx.date), "yyyy-MM")));
  if (months.size > 1) return null;

  const first = new Date(transactions[0].date);
  const monthLabel = format(first, "MMMM 'de' yyyy", { locale: ptBR });
  return `Identifiquei dados apenas de ${monthLabel}. Para uma visão anual mais precisa, envie também os meses anteriores.`;
}
