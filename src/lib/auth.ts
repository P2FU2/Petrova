import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

interface AuthTokenPayload {
  sub: string;
  workspaceId: string;
}

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: string;
}

const DEFAULT_DEMO_EMAIL = "demo@financeos.local";
const DEFAULT_DEMO_PASSWORD = "Demo@123456";
export const AUTH_COOKIE_NAME = "petrova_auth";

function secret() {
  return process.env.JWT_SECRET || "petrova-dev-secret";
}

export function signToken(userId: string, workspaceId: string) {
  return jwt.sign({ sub: userId, workspaceId } as AuthTokenPayload, secret(), {
    expiresIn: "7d"
  });
}

export function canUseDemoAuth() {
  return process.env.ENABLE_DEMO_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  };
}

export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(), maxAge: 0 });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, secret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function checkPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function ensureDemoContext(): Promise<AuthContext> {
  let user = await prisma.user.findUnique({ where: { email: DEFAULT_DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEFAULT_DEMO_EMAIL,
        passwordHash: await hashPassword(DEFAULT_DEMO_PASSWORD),
        profile: {
          create: {
            onboardingDone: false
          }
        }
      }
    });
  }

  let membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true }
  });

  if (!membership) {
    const workspace = await prisma.workspace.create({
      data: {
        name: "Workspace Principal",
        kind: "pf",
        members: {
          create: {
            userId: user.id,
            role: "owner"
          }
        }
      }
    });
    membership = await prisma.workspaceMember.findFirstOrThrow({
      where: { userId: user.id, workspaceId: workspace.id },
      include: { workspace: true }
    });
  }

  return {
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role
  };
}

export async function getAuthContext(req: NextRequest, allowDemo = true): Promise<AuthContext | null> {
  const auth = req.headers.get("authorization");
  const headerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
  const token = headerToken || cookieToken;

  if (!token) {
    const explicitDemoHeader = req.headers.get("x-petrova-demo-auth") === "true";
    return allowDemo && explicitDemoHeader && canUseDemoAuth() ? ensureDemoContext() : null;
  }

  const payload = verifyToken(token);
  if (!payload) return null;

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: payload.sub,
      workspaceId: payload.workspaceId
    }
  });

  if (!member) return null;
  return {
    userId: member.userId,
    workspaceId: member.workspaceId,
    role: member.role
  };
}

export function requireRole(context: AuthContext, allowedRoles: string[]) {
  return allowedRoles.includes(context.role);
}
