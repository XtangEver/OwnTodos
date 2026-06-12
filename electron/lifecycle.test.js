import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("window close behavior", () => {
  it("hides to background only when tray is available", () => {
    const { shouldHideOnClose } = require("./lifecycle.cjs");

    expect(shouldHideOnClose({ isQuitting: false, hasTray: true })).toBe(true);
    expect(shouldHideOnClose({ isQuitting: false, hasTray: false })).toBe(false);
    expect(shouldHideOnClose({ isQuitting: true, hasTray: true })).toBe(false);
  });
});
