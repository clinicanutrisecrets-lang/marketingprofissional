import Link from "next/link";
import { validarToken } from "@/lib/admin/convites";
import AceitarConviteForm from "./AceitarConviteForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ConvitePage({ params }: Props) {
  const { token } = await params;
  const resultado = await validarToken(token);

  if (!resultado.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-muted p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-brand-text">Convite inválido</h1>
          <p className="mb-6 text-sm text-brand-text/60">{resultado.erro}</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            Voltar pro início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-lg p-6 lg:p-12">
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-primary">
            Scanner da Saúde · Franquia Digital
          </div>
          <h1 className="text-3xl font-bold text-brand-text">
            Bem-vinda, {resultado.convite!.nome_completo.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-brand-text/60">
            Defina uma senha pra entrar no seu painel e começar o onboarding.
          </p>
        </div>

        <AceitarConviteForm
          token={token}
          email={resultado.convite!.email}
          nomeCompleto={resultado.convite!.nome_completo}
        />
      </div>
    </main>
  );
}
