import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { categoryBreakdown } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { listTransactions } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  return NextResponse.json(categoryBreakdown(await listTransactions(context)));
}
