import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const tx = getState().transactions.find((item) => item.id === id);

  if (!tx) {
    return NextResponse.json({ error: "Transacao nao encontrada." }, { status: 404 });
  }

  if (typeof body.category === "string" && body.category) tx.category = body.category;
  if (typeof body.needsReview === "boolean") tx.needsReview = body.needsReview;
  if (typeof body.isSubscription === "boolean") tx.isSubscription = body.isSubscription;

  return NextResponse.json(tx);
}
