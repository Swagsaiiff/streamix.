import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env");

try {
  process.loadEnvFile(envPath);
} catch {
  // no .env file at the repo root; exported environment variables are used as-is
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production"
};
