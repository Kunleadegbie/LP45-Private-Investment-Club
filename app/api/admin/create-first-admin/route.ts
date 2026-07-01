import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: false, message: "This setup endpoint has been disabled." },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: "This setup endpoint has been disabled." },
    { status: 403 }
  );
}