import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { addAlert, addBill, listBills } from "@/lib/repository";

const createBillSchema = z.object({
  beneficiary: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  barcode: z.string().optional()
});

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const bills = await listBills(context);
  return NextResponse.json(
    bills.map((bill) => ({
      ...bill,
      amount: Number(bill.amount),
      dueDate: bill.dueDate.toISOString()
    }))
  );
}

export async function POST(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const payload = await req.json();
  const parsed = createBillSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de boleto invalidos." }, { status: 400 });
  }

  const bill = await addBill(context, parsed.data);
  const due = new Date(bill.dueDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3 && bill.status !== "pago") {
    await addAlert(context, {
      type: "bill_due",
      title: "Boleto proximo do vencimento",
      description: `${bill.beneficiary} vence em ${Math.max(diffDays, 0)} dia(s).`
    });
  }

  return NextResponse.json(
    {
      ...bill,
      amount: Number(bill.amount),
      dueDate: bill.dueDate.toISOString()
    },
    { status: 201 }
  );
}
