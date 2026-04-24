import { NextResponse } from "next/server";
import { categoryBreakdown } from "@/lib/analytics";
import { listTransactions } from "@/lib/store";

export async function GET() {
  return NextResponse.json(categoryBreakdown(listTransactions()));
}
