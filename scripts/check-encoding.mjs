#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const ALLOWED_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".css",
]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);
const PATTERNS = [
  "\u00c3\u00a1",
  "\u00c3\u00a9",
  "\u00c3\u00ad",
  "\u00c3\u00b3",
  "\u00c3\u00ba",
  "\u00c3\u00b1",
  "\u00c3\u0081",
  "\u00c3\u0089",
  "\u00c3\u008d",
  "\u00c3\u0093",
  "\u00c3\u009a",
  "\u00c3\u0091",
  "\u00c2\u00b4",
  "\u00c2\u00bf",
  "\u00c2\u00a1",
  "m\u00c3\u00a9",
  "configuraci\u00c3\u00b3n",
  "informaci\u00c3\u00b3n",
  "pr\u00c3\u00b3x",
  "d\u00c3\u00adas",
];

async function walk(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXT.has(ext)) results.push(full);
    }
  }
  return results;
}

async function main() {
  const files = await walk(ROOT);
  let hasErrors = false;

  for (const file of files) {
    if (file.endsWith("scripts/check-encoding.mjs")) continue; // evita falso positivo en este propio script
    const content = await fs.readFile(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const pat of PATTERNS) {
        if (line.includes(pat)) {
          hasErrors = true;
          console.error(
            `[encoding] ${path.relative(ROOT, file)}:${idx + 1} contiene posible mojibake (“${pat}”).`,
          );
        }
      }
    });
  }

  if (hasErrors) {
    console.error(
      "\nSe detectaron posibles problemas de encoding (UTF-8). Reemplaza las cadenas mojibake por texto correcto en español.",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fallo el chequeo de encoding:", err);
  process.exit(1);
});
