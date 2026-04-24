import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "petrova-web",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "petrova-web",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
