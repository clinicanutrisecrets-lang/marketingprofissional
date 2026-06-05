import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStatus, getDownloadUrl } from "@/lib/captions/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const job = await getStatus(params.jobId);
    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      downloadUrl: job.status === "COMPLETE" ? getDownloadUrl(job.video_id) : null,
      videoId: job.video_id,
      error: job.error,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
