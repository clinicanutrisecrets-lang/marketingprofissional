import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import {
  getInstagramProfileFull,
  getInstagramMedia,
  type InstagramProfile,
  type InstagramMedia,
} from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";

const CONNECT_URL = "/api/auth/meta/start?return_to=/en/dashboard/perfil-instagram";

export default async function PerfilInstagramPageEN() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/en/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");

  const f = franqueada as Record<string, unknown>;
  const igAccountId = f.instagram_conta_id as string | null;
  const encryptedToken = f.instagram_access_token as string | null;

  let profile: InstagramProfile | null = null;
  let media: InstagramMedia[] = [];
  let apiError: string | null = null;

  if (igAccountId && encryptedToken) {
    try {
      const pageToken = decrypt(encryptedToken);
      const [p, m] = await Promise.all([
        getInstagramProfileFull(igAccountId, pageToken),
        getInstagramMedia(igAccountId, pageToken, 9),
      ]);
      profile = p;
      media = m;
    } catch (e) {
      apiError = e instanceof Error ? e.message : "Failed to load Instagram data";
    }
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/en/dashboard"
              className="text-sm text-brand-text/60 hover:text-brand-primary"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-brand-text lg:text-3xl">
              Nutritionist Instagram Profile
            </h1>
            <p className="text-sm text-brand-text/60">
              Data from your Instagram Business account connected to the platform.
            </p>
          </div>
        </header>

        {!igAccountId && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="mb-2 text-brand-text">
              You haven&apos;t connected your Instagram account yet.
            </p>
            <p className="mb-4 text-sm text-brand-text/60">
              We&apos;ll request the following Meta permissions:
              <br />
              <span className="font-mono text-xs">
                instagram_basic · instagram_content_publish ·
                instagram_manage_insights · pages_show_list ·
                pages_read_engagement · business_management · ads_management
              </span>
            </p>
            <Link
              href={CONNECT_URL}
              className="inline-block rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Connect Instagram with Facebook
            </Link>
          </div>
        )}

        {igAccountId && apiError && (
          <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            <strong>Failed to load Instagram data:</strong> {apiError}
            <div className="mt-3">
              <Link
                href={CONNECT_URL}
                className="text-red-700 underline hover:text-red-900"
              >
                Reconnect Instagram
              </Link>
            </div>
          </div>
        )}

        {profile && (
          <>
            <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm lg:p-8">
              <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
                {profile.profile_picture_url ? (
                  <Image
                    src={profile.profile_picture_url}
                    alt={profile.username}
                    width={128}
                    height={128}
                    className="h-32 w-32 rounded-full border-4 border-brand-muted object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-primary text-4xl font-bold text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <div className="mb-1 text-lg font-semibold text-brand-text">
                    {profile.name ?? profile.username}
                  </div>
                  <div className="mb-3 text-sm text-brand-text/60">
                    @{profile.username}
                  </div>

                  {profile.biography && (
                    <p className="mb-4 whitespace-pre-line text-sm text-brand-text/80">
                      {profile.biography}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-6 text-sm">
                    <Stat label="Followers" value={profile.followers_count} />
                    <Stat label="Following" value={profile.follows_count} />
                    <Stat label="Posts" value={profile.media_count} />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
                Latest posts
              </h2>
              {media.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-sm text-brand-text/60 shadow-sm">
                  No posts found in this account.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

function Stat({ label, value }: { label: string; value?: number }) {
  const formatted =
    value == null
      ? "—"
      : value >= 1000
        ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
        : String(value);
  return (
    <div>
      <div className="text-xl font-bold text-brand-text">{formatted}</div>
      <div className="text-xs uppercase tracking-wider text-brand-text/60">
        {label}
      </div>
    </div>
  );
}

function MediaCard({ media }: { media: InstagramMedia }) {
  const thumb =
    media.media_type === "VIDEO"
      ? media.thumbnail_url ?? media.media_url
      : media.media_url;

  return (
    <a
      href={media.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square overflow-hidden rounded-xl bg-brand-muted shadow-sm"
    >
      {thumb ? (
        <Image
          src={thumb}
          alt={media.caption?.slice(0, 60) ?? "Post"}
          fill
          className="object-cover transition group-hover:scale-105"
          unoptimized
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-brand-text/40">
          Post
        </div>
      )}
      {media.media_type === "VIDEO" && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          ▶ Video
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
        <span>♥ {media.like_count ?? 0}</span>
        <span>💬 {media.comments_count ?? 0}</span>
      </div>
    </a>
  );
}
