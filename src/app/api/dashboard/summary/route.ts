import { NextResponse } from "next/server";
import { summarizeTransactions } from "@/lib/analytics";
import { listTransactions } from "@/lib/store";

export async function GET() {
  return NextResponse.json(summarizeTransactions(listTransactions()));
}
