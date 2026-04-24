import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { markBillPaid } from "@/lib/repository";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;
  const ok = await markBillPaid(context, id);
  if (!ok) {
    return NextResponse.json({ error: "Boleto nao encontrado." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
