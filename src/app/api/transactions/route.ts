import { NextResponse } from "next/server";
import { listTransactions } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listTransactions());
}
