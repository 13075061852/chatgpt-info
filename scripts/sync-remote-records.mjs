import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const namespaceId = "f2d604ad95ae4b68a07f263193bc8601";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

const runWrangler = (args, options = {}) =>
  execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: rootDir,
    ...options
  });

const remoteRecords = runWrangler(
  ["kv", "key", "get", "records", "--remote", "--namespace-id", namespaceId],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
).trim();

const records = remoteRecords || "[]";
const parsedRecords = JSON.parse(records);

if (!Array.isArray(parsedRecords)) {
  throw new Error("Remote records value is not an array");
}

runWrangler(["kv", "key", "put", "records", records, "--local", "--namespace-id", "DATA_STORE"], {
  stdio: "inherit"
});

console.log(`Synced ${parsedRecords.length} remote record(s) into local DATA_STORE.`);
