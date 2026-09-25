import { env } from "../env";

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  if (!env.resendApiKey && !env.isProduction) {
    console.log(`[dev] magic link for ${to}: ${url}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      subject: "Your ponoc sign-in link",
      text: `Sign in to ponoc:\n\n${url}\n\nThis link expires in 5 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<p>Sign in to ponoc:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes. If you didn't ask for it, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend failed with ${response.status}: ${await response.text()}`);
  }
}
