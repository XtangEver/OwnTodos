import { createRequire } from "node:module";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("tray icon resource", () => {
  it("uses an ico icon file in development", () => {
    const { getTrayIconPath } = require("./trayIcon.cjs");
    const iconPath = getTrayIconPath({
      isPackaged: false,
      baseDir: __dirname,
      resourcesPath: "C:\\ignored"
    });

    expect(iconPath.endsWith("tray.ico")).toBe(true);
    expect(iconPath.includes("svg")).toBe(false);
    expect(fs.existsSync(iconPath)).toBe(true);
    expect(fs.readFileSync(iconPath).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  });

  it("uses an unpacked resources path after packaging", () => {
    const { getTrayIconPath } = require("./trayIcon.cjs");
    const iconPath = getTrayIconPath({
      isPackaged: true,
      baseDir: "C:\\ignored\\app.asar\\electron",
      resourcesPath: "C:\\Program Files\\OwnTodos\\resources"
    });

    expect(iconPath).toBe("C:\\Program Files\\OwnTodos\\resources\\assets\\tray.ico");
  });

  it("does not throw when nativeImage cannot load the icon", () => {
    const { createTrayIconImage } = require("./trayIcon.cjs");
    const nativeImage = {
      createFromPath() {
        return {
          isEmpty() {
            return true;
          }
        };
      }
    };

    const icon = createTrayIconImage(nativeImage, {
      isPackaged: false,
      resourcesPath: ""
    });

    expect(icon).toBeNull();
  });
});
