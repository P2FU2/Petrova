import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { updateTransaction } from "@/lib/repository";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updated = await updateTransaction(context, id, {
    category: typeof body.category === "string" && body.category ? body.category : undefined,
    needsReview: typeof body.needsReview === "boolean" ? body.needsReview : undefined,
    isSubscription: typeof body.isSubscription === "boolean" ? body.isSubscription : undefined
  });

  if (!updated) {
    return NextResponse.json({ error: "Transacao nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
