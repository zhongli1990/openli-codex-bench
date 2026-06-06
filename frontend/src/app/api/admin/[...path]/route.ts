import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/admin/${path}${searchParams ? `?${searchParams}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Admin proxy error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/admin/${path}${searchParams ? `?${searchParams}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Admin proxy error:", error);
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
