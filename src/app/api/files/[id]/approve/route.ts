import { NextResponse } from "next/server";
import { approveFileTransactions, getFile, updateFile } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const file = getFile(id);

  if (!file) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  const approved = approveFileTransactions(id);
  updateFile(id, { status: "approved" });

  return NextResponse.json({ approvedTransactions: approved });
}
