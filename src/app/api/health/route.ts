import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "petrova-web",
        database: "up",
        timestamp: new Date().toISOString()
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "petrova-web",
        database: "down",
        timestamp: new Date().toISOString()
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
