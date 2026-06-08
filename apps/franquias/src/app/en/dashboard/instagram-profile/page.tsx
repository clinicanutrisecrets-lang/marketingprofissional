import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import {
  getInstagramProfileFull,
  getInstagramMedia,
  type InstagramProfile,
  type InstagramMedia,
} from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";

export default async function EnInstagramProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const admin = createAdminClient();
  const { data: fData } = await admin
    .from("franqueadas")
    .select("id, instagram_conta_id, instagram_access_token, instagram_handle, instagram_token_expiry")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const f = fData as unknown as Record<string, unknown> | null;

  if (!f || !f.instagram_conta_id || !f.instagram_access_token) {
    return <NotConnected connectUrl="/api/auth/meta/start?return_to=/en/dashboard/instagram-profile" />;
  }

  let profile: InstagramProfile | null = null;
  let media: InstagramMedia[] = [];
  let apiError: string | null = null;

  try {
    const token = decrypt(f.instagram_access_token as string);
    const igId = f.instagram_conta_id as string;
    [profile, media] = await Promise.all([
      getInstagramProfileFull(igId, token),
      getInstagramMedia(igId, token, 9),
    ]);
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Error fetching Instagram data";
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/en/dashboard" className="text-xs font-medium text-brand-text/60 hover:text-brand-primary">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-brand-text">Instagram Profile</h1>
          </div>
        </header>

        {apiError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{apiError}</div>
        )}

        {profile && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-6">
              {profile.profile_picture_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_picture_url}
                  alt={profile.username}
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-brand-text">@{profile.username}</h2>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Connected
                  </span>
                </div>
                {profile.name && (
                  <p className="text-sm text-brand-text/70">{profile.name}</p>
                )}
                {profile.biography && (
                  <p className="mt-2 text-sm text-brand-text/60">{profile.biography}</p>
                )}
                <div className="mt-4 flex gap-6 text-sm">
                  <Stat label="Followers" value={profile.followers_count ?? 0} />
                  <Stat label="Following" value={profile.follows_count ?? 0} />
                  <Stat label="Posts" value={profile.media_count ?? 0} />
                </div>
              </div>
            </div>
          </div>
        )}

        {media.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
              Recent Posts
            </h2>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {media.map((m) => (
                <a
                  key={m.id}
                  href={m.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group aspect-square overflow-hidden rounded-lg bg-brand-muted"
                >
                  {m.thumbnail_url || m.media_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumbnail_url ?? m.media_url}
                      alt={m.caption?.slice(0, 50) ?? "Instagram post"}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-brand-text/40">
                      {m.media_type}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-bold text-brand-text">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
      </div>
      <div className="text-xs text-brand-text/50">{label}</div>
    </div>
  );
}

function NotConnected({ connectUrl }: { connectUrl: string }) {
  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link href="/en/dashboard" className="text-xs font-medium text-brand-text/60 hover:text-brand-primary">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">Instagram Profile</h1>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-text">Instagram not connected yet</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Connect your Instagram Business account to view your profile, reach, and engagement
            metrics here — and to enable automatic post publishing.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-brand-text/10 p-4">
              <h3 className="mb-2 text-sm font-semibold text-brand-text">Requirements</h3>
              <ul className="space-y-1 text-xs text-brand-text/60">
                <li>• Instagram account must be set as <strong>Professional</strong> (Creator or Business)</li>
                <li>• Must be linked to a <strong>Facebook Page</strong> you manage</li>
                <li>• You will be asked to authorize Scanner da Saúde to read insights and publish content</li>
              </ul>
            </div>

            <a
              href={connectUrl}
              className="inline-block rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Connect Instagram with Facebook →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
