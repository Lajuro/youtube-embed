#!/usr/bin/env node
/**
 * Roda o Next.js usando o proxy da rede (útil em empresas).
 *
 * Por padrão o `fetch` do Node ignora proxy — então a busca no YouTube, que roda
 * no servidor do app, tenta sair direto para a internet e falha. Este script:
 *
 *  1. liga o suporte a proxy do Node (--use-env-proxy, Node 22.21+ ou 24+);
 *  2. usa os certificados do sistema operacional (--use-system-ca), pois muitas
 *     empresas inspecionam o HTTPS com um certificado próprio;
 *  3. se HTTPS_PROXY não estiver definido, reaproveita o proxy configurado no npm
 *     (`npm config get https-proxy`) — se o `npm install` funciona, ele tem o proxy certo.
 *
 * Uso: npm run dev:proxy   (ou npm run start:proxy depois do build)
 */

import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] === "start" ? "start" : "dev";
const env = { ...process.env };

function npmConfig(key) {
  try {
    const value = execSync(`npm config get ${key}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return value && value !== "null" && value !== "undefined" ? value : "";
  } catch {
    return "";
  }
}

if (!env.HTTPS_PROXY && !env.https_proxy) {
  const proxy = npmConfig("https-proxy") || npmConfig("proxy");
  if (proxy) {
    env.HTTPS_PROXY = proxy;
    env.HTTP_PROXY ??= proxy;
    console.log(`→ Usando o proxy configurado no npm: ${proxy.replace(/\/\/[^@/]*@/, "//***@")}`);
  } else {
    console.warn("⚠ Nenhum proxy encontrado (nem HTTPS_PROXY, nem no npm). Defina HTTPS_PROXY se a sua rede usar um.");
  }
} else {
  console.log("→ Usando o proxy da variável HTTPS_PROXY");
}
env.NO_PROXY ??= "localhost,127.0.0.1,::1";
env.NODE_OPTIONS = [env.NODE_OPTIONS, "--use-env-proxy", "--use-system-ca"].filter(Boolean).join(" ");

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, mode, ...process.argv.slice(3)], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
