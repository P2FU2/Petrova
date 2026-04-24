import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { listAlerts, markAlertAsRead } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  return NextResponse.json(await listAlerts(context));
}

export async function PATCH(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Id do alerta e obrigatorio." }, { status: 400 });
  }

  const ok = await markAlertAsRead(context, body.id);
  if (!ok) {
    return NextResponse.json({ error: "Alerta nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
