import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarJob } from "@/lib/captions/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { videoUrl, captionTemplateId } = body as {
    videoUrl: string;
    captionTemplateId: string;
  };

  if (!videoUrl || !captionTemplateId) {
    return NextResponse.json({ erro: "videoUrl e captionTemplateId são obrigatórios" }, { status: 400 });
  }

  try {
    const job = await criarJob(videoUrl, captionTemplateId);
    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
