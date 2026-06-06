export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const upstream = await fetch(`${BACKEND_URL}/api/sessions/${params.sessionId}/runs`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" }
  });
}
