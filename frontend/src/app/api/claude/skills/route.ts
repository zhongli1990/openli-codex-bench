import { NextRequest, NextResponse } from "next/server";

const CLAUDE_RUNNER_URL = process.env.CLAUDE_RUNNER_URL || "http://claude-runner:8082";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    const response = await fetch(
      `${CLAUDE_RUNNER_URL}/api/skills${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Failed to fetch skills" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${CLAUDE_RUNNER_URL}/api/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { detail: error.detail || "Failed to create skill" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating skill:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}
