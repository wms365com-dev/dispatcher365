export async function GET() {
  return Response.json({
    ok: true,
    service: "wms365-dispatch",
    time: new Date().toISOString()
  });
}
