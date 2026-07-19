import fs from "fs";
import path from "path";

/**
 * Load `.env` / `.env.local` into process.env for CLI (Next.js loads these itself).
 * Does not override existing process.env values.
 */
export function loadPresenceEnv(cwd: string = process.cwd()): void {
  for (const name of [".env", ".env.local"]) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
