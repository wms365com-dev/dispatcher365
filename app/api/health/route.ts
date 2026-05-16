export async function GET() {
  return Response.json({
    ok: true,
    service: "ship365-dispatch",
    time: new Date().toISOString()
  });
}
