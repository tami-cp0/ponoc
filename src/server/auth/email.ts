import { env } from "../env";
import { magicLinkEmail } from "./magic-link-email";

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
      ...magicLinkEmail(url),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend failed with ${response.status}: ${await response.text()}`);
  }
}
