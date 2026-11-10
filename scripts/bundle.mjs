#!/usr/bin/env node
/**
 * Gera os dois "instaladores" que permitem recriar o projeto sem `git clone`
 * e sem baixar o .zip (úteis em redes corporativas que bloqueiam isso):
 *
 *   instalador/sintonia-instalador.cjs  → contém TODOS os arquivos do projeto,
 *     compactados (gzip) e codificados em base64. Basta copiar este único
 *     arquivo e rodar `node sintonia-instalador.cjs`.
 *
 *   instalador/baixar-arquivos.mjs      → baixa cada arquivo do GitHub pelo
 *     endereço "raw", um por um.
 *
 * Rode `npm run bundle` sempre que mudar o código, para os instaladores
 * ficarem atualizados. `npm run bundle -- --check` só verifica se estão em dia.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "instalador");
const INSTALLER = join(OUT_DIR, "sintonia-instalador.cjs");
const DOWNLOADER = join(OUT_DIR, "baixar-arquivos.mjs");
const REPO = "Lajuro/youtube-embed";
const check = process.argv.includes("--check");

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

// Arquivos versionados + novos ainda não commitados (respeitando o .gitignore).
const files = git("ls-files", "--cached", "--others", "--exclude-standard")
  .split("\n")
  .filter(Boolean)
  .filter((f) => !f.startsWith("instalador/"))
  .filter((f) => existsSync(join(ROOT, f)))
  .sort();

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

// Texto vai como texto (comprime muito melhor); binários, em base64.
const entries = files.map((path) => {
  const buffer = readFileSync(join(ROOT, path));
  const text = buffer.toString("utf8");
  return Buffer.from(text, "utf8").equals(buffer) ? [path, "utf8", text] : [path, "base64", buffer.toString("base64")];
});
// mtime fixo → o .gz é idêntico para o mesmo conteúdo (o --check depende disso).
const payload = gzipSync(Buffer.from(JSON.stringify(entries)), { level: 9 }).toString("base64");
const lines = payload.match(/.{1,100}/g).map((l) => JSON.stringify(l)).join(",\n  ");

const installer = `#!/usr/bin/env node
/*
 * Instalador do Sintonia — gerado automaticamente por scripts/bundle.mjs.
 * NÃO edite à mão: rode \`npm run bundle\` no projeto para regenerar.
 *
 * Contém ${files.length} arquivos do projeto (compactados com gzip, em base64).
 *
 * Como usar:
 *   1. Salve este arquivo como "sintonia-instalador.cjs" (no Bloco de Notas,
 *      escolha "Todos os arquivos" para não virar .cjs.txt).
 *   2. Rode:  node sintonia-instalador.cjs            (cria a pasta ./sintonia)
 *        ou:  node sintonia-instalador.cjs minha-pasta
 *      Use --force para sobrescrever arquivos de uma pasta que já existe.
 *   3. Entre na pasta e rode:  npm install  e depois  npm run dev
 *
 * Se aparecer "SyntaxError" ou "corrompido", o arquivo foi salvo incompleto:
 * baixe/copie de novo (o arquivo termina com a linha "console.log(\"  5. No navegador...").
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const PAYLOAD = [
  ${lines},
].join("");

const args = process.argv.slice(2);
const force = args.includes("--force");
const target = path.resolve(args.find((a) => !a.startsWith("--")) || "sintonia");

let entries;
try {
  entries = JSON.parse(zlib.gunzipSync(Buffer.from(PAYLOAD, "base64")).toString("utf8"));
} catch (err) {
  console.error("✖ O conteúdo deste instalador está corrompido (o arquivo foi copiado pela metade?).");
  console.error("  Detalhe:", err.message);
  process.exit(1);
}

if (fs.existsSync(target) && fs.readdirSync(target).length > 0 && !force) {
  console.error(\`✖ A pasta "\${target}" já existe e não está vazia.\`);
  console.error("  Escolha outra pasta ou rode de novo com --force para sobrescrever os arquivos.");
  process.exit(1);
}

// A pasta .next guarda o resultado de compilações antigas: se ficar, "npm start" (ou o
// cache do "npm run dev") pode continuar mostrando a versão anterior do app.
const staleBuild = path.join(target, ".next");
if (fs.existsSync(staleBuild)) {
  fs.rmSync(staleBuild, { recursive: true, force: true });
  console.log("• Pasta .next antiga apagada (cache da versão anterior).");
}

let written = 0;
for (const [relative, encoding, data] of entries) {
  const destination = path.resolve(target, relative);
  // Proteção: nunca escrever fora da pasta de destino.
  if (!destination.startsWith(target + path.sep)) {
    console.error(\`✖ Caminho inválido ignorado: \${relative}\`);
    continue;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.from(data, encoding));
  written++;
}

console.log(\`✔ \${written} arquivos criados em \${target}\`);
console.log(\`  Versão: Sintonia ${version} (confira em Configurações, no rodapé)\`);
console.log("");
console.log("Próximos passos:");
console.log("  1. Feche qualquer “npm run dev” ou “npm start” que ainda esteja aberto (Ctrl+C no terminal).");
console.log(\`  2. cd "\${path.relative(process.cwd(), target) || "."}"\`);
console.log("  3. npm install");
console.log("  4. npm run dev        # abre em http://localhost:3000");
console.log("  5. No navegador, recarregue com Ctrl+Shift+R.");
`;

const downloader = `#!/usr/bin/env node
/*
 * Baixa o projeto Sintonia do GitHub arquivo por arquivo (via raw.githubusercontent.com).
 * Gerado automaticamente por scripts/bundle.mjs — rode \`npm run bundle\` para regenerar.
 *
 * Uso:
 *   node baixar-arquivos.mjs [pasta] [--branch=nome] [--force]
 *
 * Padrões: pasta "sintonia", branch "${branch}".
 * Precisa do Node 18 ou mais novo (usa fetch nativo).
 * Se a sua rede usa proxy, o Node pode não enxergá-lo — nesse caso prefira o
 * sintonia-instalador.cjs, que não precisa de internet para recriar os arquivos.
 */

import fs from "node:fs";
import path from "node:path";

const REPO = ${JSON.stringify(REPO)};
const FILES = ${JSON.stringify(files, null, 2)};

const args = process.argv.slice(2);
const force = args.includes("--force");
const branch = args.find((a) => a.startsWith("--branch="))?.split("=")[1] || ${JSON.stringify(branch)};
const target = path.resolve(args.find((a) => !a.startsWith("--")) || "sintonia");

if (fs.existsSync(target) && fs.readdirSync(target).length > 0 && !force) {
  console.error(\`✖ A pasta "\${target}" já existe e não está vazia. Use --force para sobrescrever.\`);
  process.exit(1);
}

const failures = [];
let done = 0;

async function download(file) {
  const url = \`https://raw.githubusercontent.com/\${REPO}/\${encodeURIComponent(branch)}/\${file.split("/").map(encodeURIComponent).join("/")}\`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const destination = path.resolve(target, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, Buffer.from(await res.arrayBuffer()));
      done++;
      process.stdout.write(\`\\r  \${done}/\${FILES.length} arquivos\`);
      return;
    } catch (err) {
      if (attempt === 3) failures.push(\`\${file} (\${err.message})\`);
      else await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
}

console.log(\`Baixando \${FILES.length} arquivos de \${REPO} (branch \${branch}) para \${target}\`);
// Poucos downloads em paralelo para não ser bloqueado.
const queue = [...FILES];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) await download(queue.shift());
  })
);
console.log("");

if (failures.length) {
  console.error(\`✖ \${failures.length} arquivo(s) falharam:\`);
  for (const f of failures) console.error("   - " + f);
  console.error("  Rode de novo com --force para tentar outra vez.");
  process.exit(1);
}

// Cache de compilações antigas: se ficar, o app pode continuar mostrando a versão anterior.
fs.rmSync(path.join(target, ".next"), { recursive: true, force: true });

console.log(\`✔ Tudo baixado (Sintonia ${version})! Próximos passos:\`);
console.log("  1. Feche qualquer “npm run dev” ou “npm start” que ainda esteja aberto (Ctrl+C).");
console.log(\`  2. cd "\${path.relative(process.cwd(), target) || "."}"\`);
console.log("  3. npm install");
console.log("  4. npm run dev        # abre em http://localhost:3000");
console.log("  5. No navegador, recarregue com Ctrl+Shift+R.");
`;

if (check) {
  const stale = [
    [INSTALLER, installer],
    [DOWNLOADER, downloader],
  ].filter(([file, content]) => !existsSync(file) || readFileSync(file, "utf8") !== content);
  if (stale.length) {
    console.error("✖ Os instaladores estão desatualizados. Rode: npm run bundle");
    process.exit(1);
  }
  console.log("✔ Instaladores em dia.");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(INSTALLER, installer);
writeFileSync(DOWNLOADER, downloader);
// Garante que os scripts gerados são JavaScript válido antes de alguém baixá-los.
for (const file of [INSTALLER, DOWNLOADER]) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`✔ ${files.length} arquivos empacotados`);
console.log(`  instalador/sintonia-instalador.cjs  ${kb(Buffer.byteLength(installer))}`);
console.log(`  instalador/baixar-arquivos.mjs      ${kb(Buffer.byteLength(downloader))}`);
