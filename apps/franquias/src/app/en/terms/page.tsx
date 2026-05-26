export const metadata = {
  title: "Terms of Service — Scanner da Saúde",
  description: "Terms of Service of the Scanner da Saúde platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-3xl text-gray-800">
        <div className="mb-6 text-sm">
          <a href="/termos" className="text-teal-600 hover:underline">🇧🇷 Versão em português</a>
        </div>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8"><strong>Last updated:</strong> April 15, 2026</p>

        <p className="mb-6">
          By using the <strong>Scanner da Saúde Franquia Digital</strong> platform (&ldquo;Platform&rdquo;),
          operated by <strong>Clínica Nutri Secrets LTDA</strong>, the User agrees to these Terms.
        </p>

        <Section title="1. Purpose">
          <p>The Platform provides automated digital marketing services for franchised nutritionists in Brazil, including: AI-powered content generation, automated Instagram publishing, Meta Ads campaign management, performance reports, and personalized landing pages.</p>
        </Section>

        <Section title="2. Registration and Eligibility">
          <ul className="list-disc pl-6 space-y-1">
            <li>The User must be a nutritionist duly registered with the Brazilian Council of Nutrition (CRN) and authorized by the franchisor.</li>
            <li>Registration information must be true and up to date.</li>
            <li>The User is responsible for the confidentiality of their access credentials.</li>
          </ul>
        </Section>

        <Section title="3. Permitted Use">
          <p className="mb-3">The User agrees NOT to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publish content that violates the Code of Ethics of the Nutritionist (CFN Resolution 599/2018) or CFN Resolution 666/2020 on advertising.</li>
            <li>Make unproven promises of results, cures for diseases, or abusive use of &ldquo;before and after&rdquo; imagery.</li>
            <li>Publish discriminatory, defamatory, or illegal content.</li>
            <li>Use the platform for purposes unrelated to professional nutrition activities.</li>
            <li>Share credentials with third parties or resell Platform services.</li>
          </ul>
        </Section>

        <Section title="4. AI-Generated Content">
          <p className="mb-3">
            The Platform uses artificial intelligence (Claude by Anthropic) to generate texts, captions, and suggestions.{" "}
            <strong>The User is the final responsible party</strong> for the content published on their behalf:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>It is your responsibility to review before approving publication.</li>
            <li>The Platform implements CFN compliance filters, but does not guarantee 100% compliance.</li>
            <li>We advise against automatic publication without human review for sensitive topics (diseases, medications, clinical cases).</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Integrations">
          <p>Functionality depends on third-party APIs (Meta, Anthropic, Creatomate, etc). We are not responsible for unavailability, changes, or rejections by these platforms. If Meta blocks the app, automatic publishing is interrupted until normalization.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform (code, design, brand) belongs to Clínica Nutri Secrets LTDA.</li>
            <li>Generated content (posts, captions, images) belongs to the User after publication, subject to image rights for stock videos (Pexels, CC0 license).</li>
            <li>By submitting own photos, the User guarantees to hold the image rights.</li>
          </ul>
        </Section>

        <Section title="7. Plans and Payment">
          <p>Values, billing cycle, and upgrade/downgrade rules are defined in the separate franchise agreement. The Platform may be suspended in case of default exceeding 15 days.</p>
        </Section>

        <Section title="8. Cancellation">
          <ul className="list-disc pl-6 space-y-1">
            <li>The User may cancel at any time by notifying the franchisor.</li>
            <li>After cancellation, access is blocked within 24 hours.</li>
            <li>Data may be exported up to 30 days after cancellation.</li>
            <li>Full data deletion via <a href="/en/data-deletion" className="text-teal-600 hover:underline">data deletion page</a>.</li>
          </ul>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>The Platform is provided &ldquo;as is&rdquo;. We do not guarantee specific marketing results. We are not liable for indirect damages, lost profits, or third-party platform failures.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>These terms may be updated. Material changes will be notified by email 30 days in advance.</p>
        </Section>

        <Section title="11. Jurisdiction">
          <p>The court of the District of Curitiba/PR, Brazil, is elected to resolve any controversies.</p>
        </Section>

        <Section title="12. Contact">
          <p>
            Clínica Nutri Secrets LTDA<br />
            Email: <a href="mailto:contato@scannerdasaude.com" className="text-teal-600 hover:underline">contato@scannerdasaude.com</a>
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3 text-gray-900">{title}</h2>
      <div className="text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}
