import { NextRequest, NextResponse } from "next/server";

const PROMPT_MANAGER_URL = process.env.PROMPT_MANAGER_URL || "http://prompt-manager:8083";

function getAuthHeader(request: NextRequest): Record<string, string> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    return { Authorization: authHeader };
  }
  return {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${PROMPT_MANAGER_URL}/${path}${searchParams ? `?${searchParams}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Prompt Manager proxy error:", error);
    return NextResponse.json({ detail: "Prompt Manager service unavailable" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  try {
    const body = await request.json();
    const res = await fetch(`${PROMPT_MANAGER_URL}/${path}`, {
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
    console.error("Prompt Manager proxy error:", error);
    return NextResponse.json({ detail: "Prompt Manager service unavailable" }, { status: 502 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  try {
    const body = await request.json();
    const res = await fetch(`${PROMPT_MANAGER_URL}/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Prompt Manager proxy error:", error);
    return NextResponse.json({ detail: "Prompt Manager service unavailable" }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  try {
    const res = await fetch(`${PROMPT_MANAGER_URL}/${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Prompt Manager proxy error:", error);
    return NextResponse.json({ detail: "Prompt Manager service unavailable" }, { status: 502 });
  }
}
