const fs = require("node:fs");
const path = require("node:path");

function formatError(error) {
  if (!error) {
    return "";
  }
  if (error.stack) {
    return error.stack;
  }
  return String(error);
}

function createLogger(app) {
  let logFile = "";

  function getLogFile() {
    if (!logFile) {
      logFile = path.join(app.getPath("userData"), "logs", "main.log");
    }
    return logFile;
  }

  function write(message, error) {
    try {
      const target = getLogFile();
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const line = `[${new Date().toISOString()}] ${message}${error ? `\n${formatError(error)}` : ""}\n`;
      fs.appendFileSync(target, line, "utf8");
    } catch {
      // Logging must never crash the app.
    }
  }

  return {
    getLogFile,
    write
  };
}

module.exports = {
  createLogger,
  formatError
};
