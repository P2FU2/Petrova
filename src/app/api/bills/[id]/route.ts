import { NextResponse } from "next/server";
import { markBillPaid } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_: Request, { params }: Params) {
  const { id } = await params;
  const bill = markBillPaid(id);
  if (!bill) {
    return NextResponse.json({ error: "Boleto nao encontrado." }, { status: 404 });
  }
  return NextResponse.json(bill);
}
