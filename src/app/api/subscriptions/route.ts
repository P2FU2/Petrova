import { NextResponse } from "next/server";
import { listSubscriptions, listTransactions, upsertSubscriptionsFromTransactions } from "@/lib/store";

export async function GET() {
  const txs = listTransactions();
  upsertSubscriptionsFromTransactions(txs);
  return NextResponse.json(listSubscriptions());
}
