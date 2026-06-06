export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function GET(_req: Request, ctx: { params: { runId: string } }) {
  const upstream = await fetch(`${BACKEND_URL}/api/runs/${ctx.params.runId}/events`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream"
    }
  });

  const contentType = upstream.headers.get("content-type") || "text/event-stream";

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
