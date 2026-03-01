import fs from "fs";
import path from "path";

const logFile = path.resolve(__dirname, "../../persistent_server.log");

export const logger = (msg: string, ...args: any[]) => {
  const formattedMsg = `[${new Date().toISOString()}] ${msg} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(" ")}\n`;
  try {
    fs.appendFileSync(logFile, formattedMsg);
  } catch (e) {
    // Fallback if filesystem write fails
    console.error("Logger failed to write to file:", e);
  }
  console.log(msg, ...args);
};
