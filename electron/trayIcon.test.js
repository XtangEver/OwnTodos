import { createRequire } from "node:module";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("tray icon resource", () => {
  it("uses a packaged bitmap icon instead of an inline svg", () => {
    const { getTrayIconPath } = require("./trayIcon.cjs");
    const iconPath = getTrayIconPath(__dirname);

    expect(iconPath.endsWith("tray.png")).toBe(true);
    expect(iconPath.includes("svg")).toBe(false);
    expect(fs.existsSync(iconPath)).toBe(true);
    expect(fs.readFileSync(iconPath).subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
  });
});
