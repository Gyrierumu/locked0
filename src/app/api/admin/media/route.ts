import { listAdminMediaAssets } from "@/modules/media/server";

export async function GET(request: Request) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  try {
    return Response.json(await listAdminMediaAssets(searchParams), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ message: "Nao foi possivel carregar a biblioteca." }, { status: 403 });
  }
}
