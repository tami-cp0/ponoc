import { expect, it } from "vitest";
import { Cooldown } from "./cooldown";

it("blocks a second take within the window and reports the wait", () => {
  const cooldown = new Cooldown(60_000);
  expect(cooldown.take("a@x.com", 0)).toBe(0);
  expect(cooldown.take("a@x.com", 15_000)).toBe(45);
  expect(cooldown.take("a@x.com", 60_000)).toBe(0);
});

it("keeps keys independent", () => {
  const cooldown = new Cooldown(60_000);
  expect(cooldown.take("a@x.com", 0)).toBe(0);
  expect(cooldown.take("b@x.com", 1_000)).toBe(0);
});

it("does not restart the window on a blocked take", () => {
  const cooldown = new Cooldown(60_000);
  cooldown.take("a@x.com", 0);
  cooldown.take("a@x.com", 59_000);
  expect(cooldown.take("a@x.com", 60_000)).toBe(0);
});
