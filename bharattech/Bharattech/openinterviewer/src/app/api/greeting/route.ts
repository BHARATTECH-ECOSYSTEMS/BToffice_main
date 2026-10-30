import { NextResponse } from "next/server";
import { getFixedGreeting } from "@/lib/prompts";

// The greeting is a fixed, hardcoded message (see lib/prompts/greeting.ts)
// - it is NOT AI-generated. This route no longer calls an AI provider; the
// provider.getInterviewGreeting() methods in lib/providers/*.ts are unused
// by this route as a result (kept there, commented as unused, in case
// AI-generated greetings are wanted again later).
export async function POST(req: Request) {
  try {
    const { studyConfig } = await req.json();

    const greeting = getFixedGreeting(studyConfig);

    return NextResponse.json({
      message: greeting
    });

  } catch (error) {
    console.error("Greeting Error:", error);

    return NextResponse.json({
      message: "Hello! Welcome, welcome from the team.\n\nLet's get started - are you ready to begin the interview?"
    });
  }
}