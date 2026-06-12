import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("main process logger", () => {
  it("writes log lines under the user data directory", () => {
    const { createLogger } = require("./logger.cjs");
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), "owntodos-log-"));
    const logger = createLogger({
      getPath(name) {
        if (name !== "userData") {
          throw new Error(`unexpected path ${name}`);
        }
        return userData;
      }
    });

    logger.write("启动测试", new Error("示例错误"));

    const logFile = path.join(userData, "logs", "main.log");
    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.readFileSync(logFile, "utf8")).toContain("启动测试");
    expect(fs.readFileSync(logFile, "utf8")).toContain("示例错误");
  });
});
