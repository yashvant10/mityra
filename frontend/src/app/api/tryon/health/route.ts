import { NextResponse } from "next/server";

export async function GET() {
  const AWS_BACKEND_URL = process.env.NEXT_PUBLIC_VTO_BACKEND_URL || "http://44.220.126.206:8000";
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    // The AWS backend serves a health check at "/health"
    const response = await fetch(`${AWS_BACKEND_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return NextResponse.json({ available: true });
    } else {
      return NextResponse.json({ available: false, status: response.status });
    }
  } catch (error) {
    return NextResponse.json({ available: false, error: "unreachable" });
  }
}
