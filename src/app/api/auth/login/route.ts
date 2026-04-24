import { NextResponse } from "next/server";
import { z } from "zod";
import { canUseDemoAuth, checkPassword, ensureDemoContext, setAuthCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  demo: z.boolean().optional()
});

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  if (payload.data.demo) {
    if (!canUseDemoAuth()) {
      return NextResponse.json({ error: "Login demo desabilitado neste ambiente." }, { status: 403 });
    }
    const demo = await ensureDemoContext();
    const token = signToken(demo.userId, demo.workspaceId);
    await setAuthCookie(token);
    return NextResponse.json({
      workspaceId: demo.workspaceId
    });
  }

  if (!payload.data.email || !payload.data.password) {
    return NextResponse.json({ error: "Email e senha sao obrigatorios." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (!user) return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });

  const valid = await checkPassword(payload.data.password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });

  const member = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!member) return NextResponse.json({ error: "Usuario sem workspace." }, { status: 403 });

  const token = signToken(user.id, member.workspaceId);
  await setAuthCookie(token);
  return NextResponse.json({ workspaceId: member.workspaceId });
}
