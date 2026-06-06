import { NextRequest, NextResponse } from "next/server";

const CLAUDE_RUNNER_URL = process.env.CLAUDE_RUNNER_URL || "http://claude-runner:8082";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    const response = await fetch(
      `${CLAUDE_RUNNER_URL}/api/skills/${name}${queryString ? `?${queryString}` : ""}`,
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
        { error: error || "Failed to fetch skill" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    const body = await request.json();
    
    const response = await fetch(
      `${CLAUDE_RUNNER_URL}/api/skills/${name}${queryString ? `?${queryString}` : ""}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { detail: error.detail || "Failed to update skill" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  try {
    const response = await fetch(
      `${CLAUDE_RUNNER_URL}/api/skills/${name}${queryString ? `?${queryString}` : ""}`,
      {
        method: "DELETE",
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Failed to delete skill" },
        { status: response.status }
      );
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json(
      { error: "Failed to connect to Claude runner" },
      { status: 500 }
    );
  }
}
