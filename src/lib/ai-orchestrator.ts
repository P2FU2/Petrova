import type { BillRecord, ChatMessage, LedgerTransaction, SubscriptionRecord } from "@/lib/types";
import { categoryBreakdown, detectIncompletePeriod, summarizeTransactions } from "@/lib/analytics";

type Intent =
  | "spending_summary"
  | "category_breakdown"
  | "subscription_detection"
  | "bill_reminder"
  | "cashflow_projection"
  | "net_worth"
  | "unknown";

interface Answer {
  text: string;
  chart?: ChatMessage["chart"];
}

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (m.includes("assinatura")) return "subscription_detection";
  if (m.includes("boleto") || m.includes("venc")) return "bill_reminder";
  if (m.includes("categoria") || m.includes("alimenta") || m.includes("gastei")) return "category_breakdown";
  if (m.includes("fluxo") || m.includes("positivo") || m.includes("negativo")) return "cashflow_projection";
  if (m.includes("patrimonio")) return "net_worth";
  if (m.includes("quanto") || m.includes("despesa") || m.includes("resumo")) return "spending_summary";
  return "unknown";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function answerWithData(
  message: string,
  transactions: LedgerTransaction[],
  subscriptions: SubscriptionRecord[],
  bills: BillRecord[]
): Answer {
  const intent = detectIntent(message);
  const summary = summarizeTransactions(transactions);
  const categories = categoryBreakdown(transactions);
  const periodAlert = detectIncompletePeriod(transactions);

  if (transactions.length === 0) {
    return {
      text: "Ainda nao tenho transacoes suficientes. Envie um CSV/Excel para eu montar seu painel financeiro."
    };
  }

  if (intent === "subscription_detection") {
    const fallback = transactions.filter((tx) => tx.isSubscription);
    const monthly = subscriptions.length
      ? subscriptions.reduce((sum, tx) => sum + tx.amount, 0)
      : fallback.reduce((sum, tx) => sum + tx.amount, 0);
    const unique = subscriptions.length
      ? subscriptions.map((item) => item.name)
      : [...new Set(fallback.map((tx) => tx.merchant || tx.descriptionClean))];

    return {
      text: `Identifiquei ${unique.length} assinaturas com custo aproximado de ${money(monthly)}/mes. Principais: ${unique.slice(0, 6).join(", ")}.`,
      chart: {
        type: "bar",
        title: "Assinaturas detectadas",
        data: unique.slice(0, 8).map((name) => ({
          name,
          value: subscriptions.length
            ? subscriptions.find((item) => item.name === name)?.amount ?? 0
            : fallback.filter((tx) => (tx.merchant || tx.descriptionClean) === name).reduce((sum, tx) => sum + tx.amount, 0)
        }))
      }
    };
  }

  if (intent === "bill_reminder") {
    const open = bills.filter((bill) => bill.status !== "pago");
    const dueSoon = open
      .map((bill) => ({ ...bill, diff: Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    if (dueSoon.length === 0) {
      return {
        text: "No momento nao encontrei boletos pendentes. Se quiser, posso cadastrar um boleto manualmente para monitorar vencimento."
      };
    }

    return {
      text: `Voce possui ${open.length} boleto(s) pendente(s). Proximos vencimentos: ${dueSoon
        .map((b) => `${b.beneficiary} (${money(b.amount)} em ${Math.max(0, b.diff)} dia(s))`)
        .join(", ")}.`,
      chart: {
        type: "bar",
        title: "Boletos pendentes",
        data: dueSoon.map((bill) => ({ name: bill.beneficiary, value: bill.amount }))
      }
    };
  }

  if (intent === "category_breakdown") {
    const top = categories[0];
    return {
      text: `Seu total de despesas e ${money(summary.expense)}. A maior categoria atual e ${top?.name ?? "n/d"} com ${money(
        top?.value ?? 0
      )}. ${periodAlert ?? ""}`.trim(),
      chart: {
        type: "pie",
        title: "Despesas por categoria",
        data: categories.slice(0, 8)
      }
    };
  }

  if (intent === "cashflow_projection") {
    return {
      text: `Receitas: ${money(summary.income)} | Despesas: ${money(summary.expense)} | Saldo atual: ${money(summary.net)}. ${
        summary.net >= 0 ? "Seu fluxo está positivo até o momento." : "Seu fluxo está negativo e merece atenção."
      }`
    };
  }

  if (intent === "net_worth") {
    return {
      text: "No MVP, o modulo patrimonial completo fica para a fase 2. Ja deixei o schema preparado para ativos, passivos e snapshots de patrimonio."
    };
  }

  return {
    text: `Resumo rapido: ${summary.totalTransactions} lancamentos, ${money(summary.income)} de entradas e ${money(summary.expense)} de saidas. Quer que eu gere um grafico por categoria ou assinatutas?`
  };
}
