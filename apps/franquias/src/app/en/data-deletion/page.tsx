"use client";

import { useState } from "react";

export default function DataDeletionPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/deletar-dados", {
      method: "POST",
      body: JSON.stringify({
        email: fd.get("email"),
        motivo: fd.get("reason"),
        instagram: fd.get("instagram"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setStatus("sent");
      setMessage(
        "Request received. Your account and all associated data will be deleted within 30 days. You will receive a confirmation email.",
      );
      form.reset();
    } else {
      setStatus("error");
      const j = await res.json().catch(() => ({}));
      setMessage(
        j.erro ??
          "Submission error. Please try again or email privacidade@scannerdasaude.com",
      );
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <article className="mx-auto max-w-2xl">
        <div className="mb-4 text-sm">
          <a href="/deletar-dados">🇧🇷 Versão em português</a>
        </div>

        <h1 className="mb-6 text-3xl font-bold">Delete my data</h1>

        <div className="prose prose-slate mb-8">
          <p>
            In accordance with Brazil&apos;s LGPD (Law 13.709/2018) and Meta
            policies, you may request complete deletion of your data from the
            Scanner da Saúde platform at any time.
          </p>

          <h2>What will be deleted</h2>
          <ul>
            <li>Your access account and credentials</li>
            <li>Registration data (name, tax ID, CRN, email, address)</li>
            <li>
              Professional data (niche, target audience, differentials,
              communication tone)
            </li>
            <li>Instagram OAuth tokens (immediately revoked)</li>
            <li>
              History of posts generated and published via the platform
            </li>
            <li>Metrics and reports</li>
            <li>Uploaded files (logo, photos, videos)</li>
            <li>Ad campaigns registered on the platform</li>
          </ul>

          <h2>What will NOT be deleted</h2>
          <ul>
            <li>
              Posts already published on your own Instagram (those remain under
              your control via your Meta account, not ours)
            </li>
            <li>
              Financial records required by law (invoices, accounting data) —
              retained for 5 years per legislation
            </li>
          </ul>

          <h2>Timeline</h2>
          <p>
            Your request will be processed within{" "}
            <strong>30 business days</strong>. You will receive a confirmation
            email when the deletion is completed.
          </p>

          <h2>Alternative contact</h2>
          <p>
            If you prefer, send a direct email to{" "}
            <a href="mailto:privacidade@scannerdasaude.com">
              privacidade@scannerdasaude.com
            </a>{" "}
            with the subject &ldquo;Data Deletion Request&rdquo;.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-brand-text/10 bg-brand-muted/30 p-6"
        >
          <h2 className="mb-4 text-lg font-semibold">Deletion form</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Registered email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="instagram">
              Instagram @handle (optional)
            </label>
            <input
              id="instagram"
              name="instagram"
              type="text"
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="@yourinstagram"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="reason">
              Reason (optional — helps us improve)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="w-full rounded-lg border border-brand-text/10 bg-white px-3 py-2"
              placeholder="e.g. cancelled my franchise, no longer using, etc."
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {status === "sending" ? "Sending..." : "Confirm deletion request"}
          </button>

          {message && (
            <p
              className={`mt-3 text-sm ${
                status === "sent" ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </article>
    </main>
  );
}
