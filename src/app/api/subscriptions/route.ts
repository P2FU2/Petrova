import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { listSubscriptions, refreshSubscriptions } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  await refreshSubscriptions(context);
  const subscriptions = await listSubscriptions(context);
  return NextResponse.json(
    subscriptions.map((sub) => ({
      ...sub,
      amount: Number(sub.amount)
    }))
  );
}
