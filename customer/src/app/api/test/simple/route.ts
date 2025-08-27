import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 TEST API: Simple POST test started");

    const body = await request.json();
    console.log("📝 TEST API: Request body:", body);

    return NextResponse.json({
      success: true,
      message: "Simple POST test successful",
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ TEST API: Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Simple GET test successful",
    timestamp: new Date().toISOString(),
  });
}
