import { join, dirname, fromFileUrl } from "@std/path";
import { assert } from "./lib/assert.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const resourcesPath = join(moduleDir, "..", "resources", "setup");

const content = await Deno.readTextFile(resourcesPath);
assert(content.length > 0, "setup script content cannot be empty");

const port = parseInt(Deno.env.get("PORT") ?? "8080");
assert(!Number.isNaN(port), "PORT must be a valid number");
assert(port >= 1 && port <= 65535, `PORT must be between 1-65535, got ${port}`);

console.log(`Listening on http://localhost:${port}`);

Deno.serve({ port }, () => new Response(content, {
  headers: { "content-type": "text/plain" },
}));
