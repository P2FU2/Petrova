import { NextResponse } from "next/server";
import { z } from "zod";
import { addAlert, addBill, listBills } from "@/lib/store";

const createBillSchema = z.object({
  beneficiary: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  barcode: z.string().optional()
});

export async function GET() {
  return NextResponse.json(listBills());
}

export async function POST(req: Request) {
  const payload = await req.json();
  const parsed = createBillSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de boleto invalidos." }, { status: 400 });
  }

  const bill = addBill(parsed.data);
  const due = new Date(bill.dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3 && bill.status !== "pago") {
    addAlert({
      type: "bill_due",
      title: "Boleto proximo do vencimento",
      description: `${bill.beneficiary} vence em ${Math.max(diffDays, 0)} dia(s).`
    });
  }

  return NextResponse.json(bill, { status: 201 });
}
