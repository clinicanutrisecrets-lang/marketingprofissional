import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import {
  getInstagramProfileFull,
  getInstagramMedia,
  type InstagramProfile,
  type InstagramMedia,
} from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";

export default async function PerfilInstagramPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: fData } = await admin
    .from("franqueadas")
    .select(
      "id, instagram_conta_id, instagram_access_token, instagram_handle, instagram_token_expiry",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const f = fData as unknown as Record<string, unknown> | null;

  if (!f || !f.instagram_conta_id || !f.instagram_access_token) {
    return <NaoConectado />;
  }

  let profile: InstagramProfile | null = null;
  let media: InstagramMedia[] = [];
  let erroApi: string | null = null;

  try {
    const pageToken = decrypt(f.instagram_access_token as string);
    const igId = f.instagram_conta_id as string;
    [profile, media] = await Promise.all([
      getInstagramProfileFull(igId, pageToken),
      getInstagramMedia(igId, pageToken, 9),
    ]);
  } catch (e) {
    erroApi = e instanceof Error ? e.message : "Erro ao consultar Meta Graph API";
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-brand-text/60 hover:text-brand-primary"
            >
              ← Voltar ao dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-brand-text lg:text-3xl">
              Perfil Instagram
            </h1>
            <p className="text-sm text-brand-text/60">
              Dados da sua conta Instagram Business conectada via Meta Graph API.
            </p>
          </div>
        </header>

        {erroApi && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Não conseguimos buscar os dados agora.</strong>
            <div className="mt-1 text-xs opacity-80">{erroApi}</div>
            <div className="mt-2 text-xs">
              Se o token expirou, reconecte em{" "}
              <Link href="/onboarding?step=6" className="underline">
                Integrações
              </Link>
              .
            </div>
          </div>
        )}

        {profile && (
          <>
            <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start gap-6">
                {profile.profile_picture_url ? (
                  <Image
                    src={profile.profile_picture_url}
                    alt={`Foto de perfil de @${profile.username}`}
                    width={120}
                    height={120}
                    className="rounded-full border border-brand-text/10"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-brand-muted text-3xl text-brand-text/40">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-brand-text">
                      @{profile.username}
                    </h2>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ● Conectado
                    </span>
                  </div>
                  {profile.name && (
                    <div className="mt-1 text-sm font-medium text-brand-text">
                      {profile.name}
                    </div>
                  )}
                  {profile.biography && (
                    <p className="mt-2 whitespace-pre-line text-sm text-brand-text/80">
                      {profile.biography}
                    </p>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-brand-primary hover:underline"
                    >
                      {profile.website}
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-brand-text/10 pt-4">
                <StatBlock
                  label="Publicações"
                  valor={profile.media_count ?? 0}
                />
                <StatBlock
                  label="Seguidores"
                  valor={profile.followers_count ?? 0}
                />
                <StatBlock
                  label="Seguindo"
                  valor={profile.follows_count ?? 0}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
                Publicações recentes
              </h3>
              {media.length === 0 ? (
                <div className="rounded-xl bg-white p-6 text-center text-sm text-brand-text/60 shadow-sm">
                  Essa conta ainda não tem publicações.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {media.map((m) => (
                    <MediaCard key={m.id} media={m} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatBlock({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-brand-text">
        {formatNumber(valor)}
      </div>
      <div className="text-xs uppercase tracking-wider text-brand-text/60">
        {label}
      </div>
    </div>
  );
}

function MediaCard({ media }: { media: InstagramMedia }) {
  const src =
    media.media_type === "VIDEO"
      ? media.thumbnail_url ?? media.media_url
      : media.media_url;

  return (
    <a
      href={media.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square overflow-hidden rounded-xl bg-brand-muted"
    >
      {src ? (
        <Image
          src={src}
          alt={media.caption?.slice(0, 80) ?? "Publicação do Instagram"}
          fill
          className="object-cover transition group-hover:scale-105"
          unoptimized
          sizes="(max-width: 640px) 33vw, 200px"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-brand-text/40">
          sem preview
        </div>
      )}
      {media.media_type === "VIDEO" && (
        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          VIDEO
        </span>
      )}
      {media.media_type === "CAROUSEL_ALBUM" && (
        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          ALBUM
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
        <div className="flex gap-3 text-xs font-medium text-white">
          {typeof media.like_count === "number" && (
            <span>♥ {formatNumber(media.like_count)}</span>
          )}
          {typeof media.comments_count === "number" && (
            <span>💬 {formatNumber(media.comments_count)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

function NaoConectado() {
  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-text lg:text-3xl">
          Perfil Instagram
        </h1>
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-text">
            Instagram ainda não conectado
          </h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Conecte sua conta Instagram Business para visualizar foto, bio,
            seguidores e publicações aqui.
          </p>
          <Link
            href="/onboarding?step=6"
            className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Conectar Instagram
          </Link>
        </div>
      </div>
    </main>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}
