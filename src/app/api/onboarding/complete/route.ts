import { NextResponse } from "next/server";
import { updateOnboarding } from "@/lib/store";

export async function POST() {
  const onboarding = updateOnboarding({ completed: true });
  return NextResponse.json(onboarding);
}
