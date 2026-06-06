import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const body = await request.json();

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

function getAuthHeader(request: NextRequest): Record<string, string> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    return { Authorization: authHeader };
  }
  return {};
}
