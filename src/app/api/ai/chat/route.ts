import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithData } from "@/lib/ai-orchestrator";
import { anonymizeText } from "@/lib/security";
import { addChatMessage, listBills, listSubscriptions, listTransactions, upsertSubscriptionsFromTransactions } from "@/lib/store";

const chatSchema = z.object({
  message: z.string().min(1)
});

export async function POST(req: Request) {
  const payload = await req.json();
  const parsed = chatSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem invalida." }, { status: 400 });
  }

  const cleanMessage = anonymizeText(parsed.data.message);
  addChatMessage({ role: "user", content: cleanMessage });

  const transactions = listTransactions();
  const subscriptions = upsertSubscriptionsFromTransactions(transactions);
  const answer = answerWithData(cleanMessage, transactions, subscriptions, listBills());
  const assistant = addChatMessage({
    role: "assistant",
    content: answer.text,
    chart: answer.chart
  });

  return NextResponse.json(assistant);
}
