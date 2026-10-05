// The sign-in email. Email clients ignore most CSS and can't load the app's fonts,
// so this is inline-styled tables in a system font stack, in the app's colours.

export const MAGIC_LINK_MINUTES = 5;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = "#171717";
const MUTED = "#737373";
const GROUND = "#f5f5f5";
// The deck's verdict colours: a row of them opens the email, like the verdict grid.
const TRUE = "#1c5334";
const FALSE = "#8e1a1a";
const PENDING = "#d4d4d4";
const VERDICT_ROW = [TRUE, TRUE, FALSE, TRUE, PENDING, TRUE, FALSE, TRUE, TRUE, PENDING, FALSE, TRUE];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function verdictRow(): string {
  const cells = VERDICT_ROW.map(
    (color) =>
      `<td style="width:10px;height:10px;padding:0;"><div style="width:10px;height:10px;border-radius:2px;background:${color};font-size:1px;line-height:1px;">&nbsp;</div></td><td style="width:3px;padding:0;"></td>`,
  ).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

export function magicLinkEmail(url: string) {
  const href = escapeHtml(url);
  const minutes = MAGIC_LINK_MINUTES;

  const text = [
    "Sign in to ponoc",
    "",
    `Open this link to sign in. It works once and expires in ${minutes} minutes.`,
    "Signing in on another device? Open it in that device's browser:",
    url,
    "",
    "If you didn't ask for this, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Sign in to ponoc</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your sign-in link. It expires in ${minutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND};">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;font-family:${FONT};">
        <tr>
          <td style="padding:0 4px 20px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${INK};">ponoc</td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:28px;">${verdictRow()}</td>
              </tr>
              <tr>
                <td style="padding-bottom:8px;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;color:${INK};">Sign in to ponoc</td>
              </tr>
              <tr>
                <td style="padding-bottom:28px;font-size:14px;line-height:1.6;color:${MUTED};">This link signs you in once and expires in ${minutes}&nbsp;minutes.</td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:999px;background:${INK};">
                        <a href="${href}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Sign in</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 4px 0;font-size:12px;line-height:1.6;color:${MUTED};">Signing in on another device? Copy this link into its browser:</td>
        </tr>
        <tr>
          <td style="padding:4px 4px 0;font-size:12px;line-height:1.5;color:${INK};word-break:break-all;">${href}</td>
        </tr>
        <tr>
          <td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${MUTED};">Didn't ask for this? You can ignore this email.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: "Your ponoc sign-in link", text, html };
}
