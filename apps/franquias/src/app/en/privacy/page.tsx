export const metadata = {
  title: "Privacy Policy — Scanner da Saúde",
  description: "Privacy Policy of the Scanner da Saúde platform.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-3xl prose prose-slate">
        <div className="mb-4 text-sm">
          <a href="/privacidade">🇧🇷 Versão em português</a>
        </div>

        <h1>Privacy Policy</h1>
        <p>
          <strong>Last updated:</strong> April 15, 2026
        </p>

        <p>
          This policy describes how <strong>Clínica Nutri Secrets LTDA</strong>,
          operator of the <strong>Scanner da Saúde Franquia Digital</strong>{" "}
          platform, collects, uses, and protects personal data of franchised
          nutritionists (&ldquo;Users&rdquo;).
        </p>

        <h2>1. Data we collect</h2>
        <ul>
          <li>
            <strong>Registration data:</strong> name, tax ID (CPF), professional
            registration number (CRN), email, phone, address, commercial name.
          </li>
          <li>
            <strong>Professional data:</strong> niche, target audience,
            differentials, professional history, service modality.
          </li>
          <li>
            <strong>Integration data:</strong> Instagram/Meta OAuth tokens
            (encrypted with AES-256-GCM), Instagram Business account IDs,
            Meta Ads campaign data.
          </li>
          <li>
            <strong>Content:</strong> texts, images, videos, and creatives
            generated/submitted by the User.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser, access logs,
            session cookies.
          </li>
        </ul>

        <h2>2. How we use the data</h2>
        <ul>
          <li>Generate personalized content (posts, captions, creatives).</li>
          <li>Publish content on the User&apos;s Instagram via Graph API.</li>
          <li>Display performance metrics and reports.</li>
          <li>Manage Meta Ads campaigns.</li>
          <li>Transactional communication (approval emails, alerts, deadlines).</li>
          <li>
            Comply with legal and regulatory obligations (CFN compliance, LGPD).
          </li>
        </ul>

        <h2>3. Meta/Instagram Integration</h2>
        <p>
          The platform uses the <strong>Instagram Graph API</strong> and the{" "}
          <strong>Meta Marketing API</strong>. By connecting your account, you
          authorize the app to:
        </p>
        <ul>
          <li>Publish posts, reels, carousels, and stories on your feed.</li>
          <li>Read post and account insights.</li>
          <li>Manage ad campaigns when enabled.</li>
        </ul>
        <p>
          Access tokens are encrypted in the database and never exposed to the
          client. You may revoke access at any time in{" "}
          <a
            href="https://accountscenter.instagram.com/apps_and_websites/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram Settings → Apps and Websites
          </a>
          .
        </p>

        <h2>4. Sharing with third parties</h2>
        <p>We share data only with essential processors:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — database and storage hosting (encryption
            in transit and at rest).
          </li>
          <li>
            <strong>Vercel</strong> — application hosting.
          </li>
          <li>
            <strong>Anthropic (Claude)</strong> — AI-powered content generation.
          </li>
          <li>
            <strong>Creatomate / Bannerbear / HeyGen</strong> — visual creative
            composition.
          </li>
          <li>
            <strong>Meta Platforms Ireland Ltd.</strong> — publishing and ads.
          </li>
          <li>
            <strong>Pexels</strong> — stock video library.
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery.
          </li>
        </ul>
        <p>
          We do not sell personal data. We do not share with advertisers, data
          brokers, or third parties without legal basis or explicit consent.
        </p>

        <h2>5. Data retention</h2>
        <ul>
          <li>
            Registration and professional data: for the duration of the active
            contract + 5 years (tax obligation).
          </li>
          <li>
            Published posts: kept indefinitely (franchisee history).
          </li>
          <li>Technical logs: 90 days.</li>
          <li>OAuth tokens: immediately invalidated upon account deletion.</li>
        </ul>

        <h2>6. Rights of the data subject (LGPD)</h2>
        <p>You may at any time:</p>
        <ul>
          <li>Request access to the data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>
            Request complete deletion of your account and all data at our{" "}
            <a href="/en/data-deletion">data deletion page</a>.
          </li>
          <li>Request data portability.</li>
          <li>Revoke consents.</li>
        </ul>
        <p>
          Send requests to{" "}
          <a href="mailto:privacidade@scannerdasaude.com">
            privacidade@scannerdasaude.com
          </a>
          .
        </p>

        <h2>7. Security</h2>
        <ul>
          <li>Mandatory HTTPS communication.</li>
          <li>AES-256-GCM encryption for sensitive tokens.</li>
          <li>
            Row Level Security (RLS) at the database — each franchisee only
            accesses her own data.
          </li>
          <li>Passwords hashed (bcrypt).</li>
          <li>Access logs monitored.</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          We use only essential cookies (authentication, session). We do not use
          our own advertising tracking cookies.
        </p>

        <h2>9. Changes</h2>
        <p>
          We may update this policy. Material changes will be notified by email
          and displayed at the top of the platform with at least 15 days&apos;
          notice.
        </p>

        <h2>10. Data Protection Officer (DPO) Contact</h2>
        <p>
          Clínica Nutri Secrets LTDA
          <br />
          Email:{" "}
          <a href="mailto:privacidade@scannerdasaude.com">
            privacidade@scannerdasaude.com
          </a>
          <br />
          City: Curitiba/PR, Brazil
        </p>
      </article>
    </main>
  );
}
