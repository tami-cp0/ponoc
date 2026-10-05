import { expect, it } from "vitest";
import { magicLinkEmail } from "./magic-link-email";

const url = "https://example.com/api/auth/magic-link/verify?token=abc&callbackURL=%2Fapp";

it("links the button to the escaped URL and prints it to copy", () => {
  const { html } = magicLinkEmail(url);
  const escaped = "https://example.com/api/auth/magic-link/verify?token=abc&amp;callbackURL=%2Fapp";
  expect(html).toContain(`href="${escaped}"`);
  expect(html).toContain(`>${escaped}</td>`);
  expect(html).not.toContain("token=abc&callbackURL");
});

it("keeps a plain-text version with the raw URL", () => {
  const { text, subject } = magicLinkEmail(url);
  expect(text).toContain(url);
  expect(text).toContain("expires in 5 minutes");
  expect(subject).toBe("Your ponoc sign-in link");
});
