export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function POST(req: Request, ctx: { params: { sessionId: string } }) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${ctx.params.sessionId}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json"
    }
  });
}
