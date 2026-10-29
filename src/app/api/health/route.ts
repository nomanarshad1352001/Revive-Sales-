export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, app: "revive-sales-command", ts: Date.now() });
}
