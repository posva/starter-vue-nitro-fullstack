// Minimal, provider-agnostic transactional email.
//
// Ships with a Resend transport (used when RESEND_API_KEY is set) hit over plain
// fetch, so there's no SDK dependency and it runs on edge/serverless. When no
// provider is configured it just logs — so local dev and an unconfigured deploy
// keep working (you can copy the link from the console to finish a flow).
//
// Swap `deliver()` for your provider of choice (Postmark, SES, …) without
// touching call sites.

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!isEmailConfigured()) {
    // Not an error: surfaces the content so flows are still completable in dev.
    console.warn(
      `[email] not sent (set RESEND_API_KEY to enable) → to=${options.to} subject="${options.subject}"\n${options.text}`,
    )
    return
  }
  await deliver(options)
}

async function deliver({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  // `from` must be an address on a domain verified in your Resend account. The
  // `onboarding@resend.dev` sandbox sender only delivers to your own account
  // email — set EMAIL_FROM to your verified sender for real usage.
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, ...(html ? { html } : {}) }),
  })

  if (!res.ok) {
    throw new Error(`[email] Resend request failed (${res.status}): ${await res.text()}`)
  }
}
