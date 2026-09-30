import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = path.join(root, "plugins", "atlas-plugin");
const manifestPath = path.join(pluginDir, "atlas-plugin.json");
const repositoryPath = path.join(root, "repository.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const repository = JSON.parse(await readFile(repositoryPath, "utf8"));

const files = [
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
];

const packageName = `${manifest.id.split(".").at(-1).replace(/[^a-z0-9-]/gi, "-").toLowerCase()}.atlas-plugin.json`;
const installPackage = {
  kind: "atlas.runtime.plugin.install-package",
  filename: packageName,
  plugin: {
    id: manifest.id,
    name: manifest.name,
    nameI18n: manifest.nameI18n,
    version: manifest.version,
    description: manifest.description,
    descriptionI18n: manifest.descriptionI18n,
    icon: manifest.icon,
    logo: manifest.logo,
    preview: manifest.preview,
    dependencies: [],
    extensionPoints: [],
    provides: manifest.capabilities ?? [],
  },
  files: await Promise.all(files.map(async ([file, mediaType]) => ({
    path: file,
    mediaType,
    content: await readFile(path.join(pluginDir, file), "utf8"),
  }))),
};

if (repository.plugins.length !== 1) {
  throw new Error("The starter catalog must contain exactly one plugin entry.");
}
const entry = repository.plugins[0];

Object.assign(entry, {
  id: manifest.id,
  name: manifest.name,
  nameI18n: manifest.nameI18n,
  version: manifest.version,
  description: manifest.description,
  descriptionI18n: manifest.descriptionI18n,
  icon: "./plugins/atlas-plugin/icon.svg",
  logo: "./plugins/atlas-plugin/logo.svg",
  preview: "./plugins/atlas-plugin/preview.svg",
  entry: manifest.entry,
  package: `./plugins/atlas-plugin/${packageName}`,
  manifest: "./plugins/atlas-plugin/atlas-plugin.json",
  capabilities: manifest.capabilities ?? [],
});

await writeFile(path.join(pluginDir, packageName), `${JSON.stringify(installPackage, null, 2)}\n`);
await writeFile(repositoryPath, `${JSON.stringify(repository, null, 2)}\n`);
console.log(`Built ${path.relative(root, path.join(pluginDir, packageName))}`);
