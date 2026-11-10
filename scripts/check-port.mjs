#!/usr/bin/env node
/**
 * Roda antes do `npm run dev`: se a porta 3000 já estiver ocupada (quase sempre por um
 * `npm run dev` antigo esquecido em outro terminal), avisa em vez de deixar o navegador
 * mostrando a versão velha do app em http://localhost:3000.
 */
import net from "node:net";

const port = Number(process.env.PORT) || 3000;
const server = net.createServer();

server.once("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.error(`
✖ A porta ${port} já está em uso.

  Provavelmente o Sintonia (uma versão anterior) ainda está rodando em outro terminal.
  O que estiver em http://localhost:${port} é esse servidor antigo.

  Como resolver:
    • Vá no terminal onde ele está rodando e aperte Ctrl+C; ou
    • Feche todos os terminais/janelas do Node e tente de novo; ou
    • No Windows (PowerShell): Get-Process node | Stop-Process
`);
  process.exit(1);
});

server.once("listening", () => server.close(() => process.exit(0)));
server.listen(port);
