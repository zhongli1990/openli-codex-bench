import { NextRequest, NextResponse } from "next/server";

const CLAUDE_RUNNER_URL = process.env.CLAUDE_RUNNER_URL || "http://claude-runner:8082";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    const response = await fetch(
      `${CLAUDE_RUNNER_URL}/api/skills/${name}/reload${queryString ? `?${queryString}` : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Failed to reload skill" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reloading skill:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}
