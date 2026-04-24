import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { answerWithData } from "@/lib/ai-orchestrator";
import { getAuthContext } from "@/lib/auth";
import { anonymizeText } from "@/lib/security";
import { addChatPair, listBills, listSubscriptions, listTransactions, refreshSubscriptions } from "@/lib/repository";

const chatSchema = z.object({
  message: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const payload = await req.json();
  const parsed = chatSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem invalida." }, { status: 400 });
  }

  const cleanMessage = anonymizeText(parsed.data.message);
  const transactions = await listTransactions(context);
  await refreshSubscriptions(context);
  const subscriptions = await listSubscriptions(context);
  const bills = await listBills(context);

  const answer = answerWithData(
    cleanMessage,
    transactions,
    subscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      amount: Number(sub.amount),
      frequency: sub.frequency as "mensal" | "semanal" | "anual",
      lastChargeDate: sub.lastChargeDate?.toISOString(),
      nextChargeDate: sub.nextChargeDate?.toISOString(),
      isEssential: sub.isEssential
    })),
    bills.map((bill) => ({
      id: bill.id,
      beneficiary: bill.beneficiary,
      amount: Number(bill.amount),
      dueDate: bill.dueDate.toISOString(),
      status: bill.status as "aberto" | "pago" | "vencido",
      barcode: bill.barcode ?? undefined
    }))
  );

  await addChatPair(context, cleanMessage, answer.text, answer.chart);
  return NextResponse.json({
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer.text,
    chart: answer.chart
  });
}
