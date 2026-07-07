import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const dataDirectory = resolve(
  process.cwd(),
  process.env.DATA_DIRECTORY?.trim() || "data"
);

await rm(dataDirectory, { recursive: true, force: true });
console.log(`Removed local event data at ${dataDirectory}.`);
console.log("Restart the server to begin a fresh setup.");
