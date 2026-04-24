import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, false);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { id: true, email: true }
  });

  return NextResponse.json({
    user,
    workspaceId: context.workspaceId,
    role: context.role
  });
}
