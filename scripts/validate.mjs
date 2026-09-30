import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = path.join(root, "plugins", "atlas-plugin");
const readJson = async file => JSON.parse(await readFile(path.join(root, file), "utf8"));
const manifest = await readJson("plugins/atlas-plugin/atlas-plugin.json");
const repository = await readJson("repository.json");

if (repository.kind !== "atlas.plugin.repository") throw new Error("Invalid repository kind.");
if (!manifest.id || !manifest.name || !manifest.version) throw new Error("Manifest must define id, name and version.");
if (!/^atlas\.plugin\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(manifest.id)) throw new Error("Plugin ID must use atlas.plugin.<lowercase-name> format.");
if (repository.plugins.length !== 1 || repository.plugins[0].id !== manifest.id) throw new Error("Repository catalog must contain exactly the plugin.");

const entry = repository.plugins[0];
for (const field of ["id", "name", "version", "description"]) {
  if (entry[field] !== manifest[field]) throw new Error(`Repository ${field} does not match the plugin manifest.`);
}
if (entry.package !== `./plugins/atlas-plugin/${entry.package.split("/").at(-1)}`) throw new Error("Package URL must point into plugins/atlas-plugin/.");
if (entry.entry !== manifest.entry) throw new Error("Repository entry URL does not match the plugin manifest.");

const installPackage = await readJson(entry.package.slice(2));
if (installPackage.kind !== "atlas.runtime.plugin.install-package") throw new Error("Invalid install package kind.");
if (installPackage.plugin.id !== manifest.id || installPackage.plugin.version !== manifest.version) throw new Error("Install package does not match the manifest.");
if (installPackage.filename !== entry.package.split("/").at(-1)) throw new Error("Install package filename does not match its catalog URL.");

const packageFiles = new Map(installPackage.files.map(file => [file.path, file.content]));
for (const [file, mediaType] of [
  ["atlas-plugin.json", "application/json"],
  ["README.md", "text/markdown"],
  ["index.html", "text/html"],
  ["styles.css", "text/css"],
  ["app.js", "text/javascript"],
  ["library-core.js", "text/javascript"],
  ["mdi-icons.json", "application/json"],
  ["icon.svg", "image/svg+xml"],
  ["logo.svg", "image/svg+xml"],
  ["preview.svg", "image/svg+xml"],
]) {
  await access(path.join(pluginDir, file));
  if (!packageFiles.has(file)) throw new Error(`Install package is missing ${file}.`);
  if (packageFiles.get(file) !== await readFile(path.join(pluginDir, file), "utf8")) throw new Error(`Install package is stale for ${file}; run npm run build.`);
  if (!installPackage.files.find(item => item.path === file && item.mediaType === mediaType)) throw new Error(`Incorrect media type for ${file}.`);
}

console.log(`Validated ${manifest.name} ${manifest.version}.`);
