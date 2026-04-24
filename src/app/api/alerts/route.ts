import { NextResponse } from "next/server";
import { listAlerts, markAlertAsRead } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listAlerts());
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Id do alerta e obrigatorio." }, { status: 400 });
  }

  const alert = markAlertAsRead(body.id);
  if (!alert) {
    return NextResponse.json({ error: "Alerta nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(alert);
}
