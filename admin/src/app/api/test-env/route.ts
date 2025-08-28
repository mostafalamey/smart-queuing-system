import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || "MISSING",
    ultramsgToken: process.env.ULTRAMSG_TOKEN ? "PRESENT" : "MISSING",
    hasToken: !!process.env.ULTRAMSG_TOKEN,
    tokenLength: process.env.ULTRAMSG_TOKEN?.length || 0,
  });
}
