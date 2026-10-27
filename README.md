# Sintonia 🎧

Um "YouTube fora do YouTube": cole links de vídeos, organize em **playlists** e **favoritos** e deixe tocando enquanto trabalha — com um player embutido, fila de reprodução, aleatório, repetir e mini player.

Não tem login nem servidor de dados: **tudo fica salvo no `localStorage` do seu navegador**.

Feito com **Next.js 16**, **Tailwind CSS 4** e **shadcn/ui** (Radix).

## Como rodar

Pré-requisito: Node.js 20 ou superior.

### Sem `git clone` e sem baixar o .zip (rede corporativa)

A pasta [`instalador/`](instalador) tem duas alternativas para recriar o projeto na sua máquina:

**Opção 1 — um arquivo só (recomendada, não precisa de internet para recriar os arquivos)**

1. Abra [`instalador/sintonia-instalador.cjs`](instalador/sintonia-instalador.cjs) no GitHub.
2. Clique em **Raw** e salve a página com `Ctrl+S` como `sintonia-instalador.cjs` — ou use o botão **Copy raw file**, cole no Bloco de Notas e salve escolhendo **Tipo: Todos os arquivos** (para não virar `.cjs.txt`).
3. No terminal, na pasta onde salvou:

   ```bash
   node sintonia-instalador.cjs          # cria a pasta ./sintonia com o projeto
   cd sintonia
   npm install
   npm run dev
   ```

Esse arquivo carrega dentro dele todos os arquivos do projeto, compactados (gzip) e convertidos em texto (base64) — por isso parece uma "sopa de letras". Ao rodar, ele só descompacta e grava cada arquivo no lugar certo.

**Opção 2 — baixar arquivo por arquivo do GitHub**

Salve [`instalador/baixar-arquivos.mjs`](instalador/baixar-arquivos.mjs) do mesmo jeito e rode `node baixar-arquivos.mjs`. Ele baixa cada arquivo de `raw.githubusercontent.com`. Só funciona se a sua rede liberar esse endereço para o Node.

> Para atualizar depois: baixe o instalador de novo e rode `node sintonia-instalador.cjs sintonia --force` (sobrescreve os arquivos do projeto; seus dados ficam no navegador, não na pasta).
>
> Quem mexer no código deve rodar `npm run bundle` antes do commit, para regenerar os instaladores.

### Com o repositório clonado

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:3000
```

Para usar no dia a dia, gere a versão otimizada:

```bash
npm run build
npm start        # http://localhost:3000
```

## Funcionalidades

- **Adicionar vídeos** por link ou ID, em qualquer formato: `watch?v=`, `youtu.be/`, `shorts/`, `live/`, `embed/`, `music.youtube.com`, código `<iframe>` ou só o ID de 11 caracteres. Dá para colar vários de uma vez (um por linha).
- **Colar em qualquer lugar**: com a página aberta, `Ctrl+V` em um link do YouTube já abre o diálogo de adicionar.
- **Buscar no YouTube** direto no app, sem chave de API (veja [como funciona](#6-busca-sem-api)).
- **Biblioteca** com busca, ordenação (recentes, título, mais tocados…) e visualização em lista ou grade.
- **Favoritos** e **playlists** com capa em mosaico, descrição e **arrastar para reordenar**.
- **Player** estilo app de música: tocar/pausar, anterior/próximo, aleatório, repetir (tudo/um), volume, barra de progresso e selo **AO VIVO** para rádios 24h.
- **Fila de reprodução** editável (tocar em seguida, adicionar à fila, reordenar, remover).
- **Tocando agora**: tela grande com o vídeo, fundo "luz ambiente" com as cores da capa e a fila ao lado.
- **Mini player** flutuante, ou **só áudio** (oculta o vídeo).
- **Retoma a sessão**: ao reabrir, a fila e a posição do vídeo continuam onde pararam.
- **Paleta de comandos** (`Ctrl+K`) e **atalhos de teclado** (aperte `?` para ver todos).
- **Backup**: exporte/importe tudo em JSON nas Configurações.
- Tema escuro/claro, responsivo para celular.

### Atalhos

| Tecla | Ação |
| --- | --- |
| `Espaço` | Tocar / pausar |
| `N` / `P` | Próximo / anterior |
| `←` / `→` | Voltar / avançar 10 s |
| `M` | Silenciar |
| `S` | Aleatório |
| `R` | Repetir (tudo → um → desligado) |
| `F` | Favoritar o que está tocando |
| `E` | Abrir/fechar "Tocando agora" |
| `Q` | Fila |
| `V` | Mostrar/ocultar mini player |
| `A` | Adicionar vídeo |
| `Ctrl+K` ou `/` | Paleta de comandos (digite algo e Enter para buscar no YouTube) |

## Como funciona por dentro

### 1. O player é um `<iframe>` do YouTube

O YouTube oferece a página `https://www.youtube.com/embed/<ID>`, feita para ser colocada dentro de outros sites. Em muitas redes corporativas o site principal é bloqueado, mas esse endereço de *embed* continua liberado — é isso que o app usa.

### 2. Controlando o iframe com `postMessage`

Um iframe de outro domínio é uma "caixa fechada": o JavaScript da nossa página não consegue mexer no que tem dentro dele. A forma oficial de conversar com ele é trocar mensagens com `window.postMessage`.

Quando o iframe é criado com `?enablejsapi=1`, o player do YouTube passa a aceitar comandos e a enviar eventos:

```text
Página  → iframe   {"event":"listening"}                       "quero receber eventos"
Página  → iframe   {"event":"command","func":"playVideo"}      tocar
Página  → iframe   {"event":"command","func":"seekTo","args":[90,true]}
iframe  → Página   {"event":"onStateChange","info":1}          1 = tocando, 2 = pausado, 0 = terminou…
iframe  → Página   {"event":"infoDelivery","info":{"currentTime":12.5,"duration":180,"videoData":{"title":"…"}}}
iframe  → Página   {"event":"onError","info":150}              150 = dono bloqueou embed
```

A [IFrame Player API oficial](https://developers.google.com/youtube/iframe_api_reference) é, na prática, um script que faz exatamente isso. Aqui o protocolo foi implementado direto em [`src/lib/youtube-bridge.ts`](src/lib/youtube-bridge.ts) para não depender de baixar mais um script de `youtube.com` (que poderia estar bloqueado mesmo com o embed liberado).

### 3. O iframe nunca sai do lugar

Se um iframe for movido de lugar no DOM (ou se o `src` dele mudar), o navegador **recarrega o vídeo**. Por isso [`PlayerHost`](src/components/player/player-host.tsx) monta o iframe uma única vez, no layout raiz, com `position: fixed`. Para virar mini player ou ocupar a tela "Tocando agora", só mudamos `top/left/width/height` via CSS — com uma transição suave. Trocar de vídeo é um comando (`loadVideoById`), não um novo iframe.

### 4. Títulos e miniaturas sem chave de API

- **Miniaturas**: vêm de `https://i.ytimg.com/vi/<ID>/hqdefault.jpg`.
- **Título e canal**: primeiro o app tenta o endpoint público de oEmbed (`youtube.com/oembed`, depois `noembed.com`). Se a rede bloquear, o próprio player informa o título (`videoData`) assim que o vídeo começa a tocar, e a biblioteca é atualizada automaticamente. Você também pode editar o título manualmente.

### 5. Dados no navegador

O estado fica em três *stores* do [Zustand](https://zustand.docs.pmnd.rs) com o middleware `persist`, gravando no `localStorage`:

| Chave | O que guarda |
| --- | --- |
| `sintonia:library` | vídeos, favoritos, playlists e histórico |
| `sintonia:player` | fila, posição, volume, aleatório/repetir |
| `sintonia:settings` | preferências (domínio do player, luz ambiente…) |

Como o servidor não tem acesso ao `localStorage`, os dados são carregados só depois que a página monta no navegador (veja `StoreHydrator` em [`src/components/providers.tsx`](src/components/providers.tsx)). Isso evita diferenças entre o HTML do servidor e o do navegador ("hydration mismatch").

### 6. Busca sem API

A API oficial de busca do YouTube exige criar um projeto no Google Cloud e uma chave. Em vez disso, o app faz o mesmo que o site do YouTube faz quando você pesquisa: chama o endpoint interno `youtubei/v1/search` (o "InnerTube"), que devolve os resultados em JSON. Se essa chamada falhar, ele baixa a página `youtube.com/results` e lê o JSON que vem embutido nela (`ytInitialData`). Veja [`src/lib/youtube-search.ts`](src/lib/youtube-search.ts).

Dois detalhes importantes:

- **A busca roda no servidor do app** (a rota [`/api/search`](src/app/api/search/route.ts)), não no navegador. O navegador não pode ler respostas de `youtube.com` vindas de outro site — é a regra de segurança chamada **CORS**. O servidor não tem essa limitação.
- Por isso, **quem precisa alcançar o youtube.com é o computador que roda o `npm run dev`**, não o seu navegador. Em rede corporativa isso costuma exigir o proxy da empresa (veja abaixo).

Como é um endpoint interno, o YouTube pode mudar o formato sem aviso. O código procura os blocos de vídeo em qualquer lugar da resposta (em vez de seguir um caminho fixo) para resistir a essas mudanças.

#### Busca em rede corporativa (proxy)

O `fetch` do Node ignora proxy por padrão — o erro típico é `fetch failed (ENOTFOUND)`. Use:

```bash
npm run dev:proxy      # ou: npm run build && npm run start:proxy
```

Esse script liga o suporte a proxy do Node (`--use-env-proxy`, exige Node 22.21+ ou 24+), usa os certificados do sistema (`--use-system-ca`, necessário quando a empresa inspeciona HTTPS) e, se `HTTPS_PROXY` não estiver definido, reaproveita o proxy configurado no npm (`npm config get https-proxy`). Também dá para informar o proxy na mão:

```powershell
# PowerShell
$env:HTTPS_PROXY = "http://proxy.suaempresa:8080"; npm run dev:proxy
```

Se o proxy da empresa bloquear o youtube.com para o servidor, a alternativa é hospedar o app fora da rede (ex.: Vercel): aí a busca roda lá e você só acessa o site.

> ⚠️ Limpar os dados do navegador apaga sua biblioteca. Use **Configurações → Exportar backup** de vez em quando.

## Estrutura

```text
src/
├── app/                  rotas (início, biblioteca, favoritos, playlists)
├── components/
│   ├── ui/               componentes shadcn/ui
│   ├── player/           iframe, barra do player, fila, "Tocando agora"
│   ├── video/            lista, cards, menus de contexto
│   ├── dialogs/          adicionar vídeo, playlist, configurações, atalhos
│   └── layout/           barra lateral e topo
├── lib/
│   ├── youtube.ts        parser de links, miniaturas, oEmbed
│   ├── youtube-bridge.ts protocolo postMessage com o player
│   ├── youtube-search.ts busca no YouTube sem chave de API (roda no servidor)
│   └── actions.ts        ações de alto nível (favoritar, tocar, backup…)
└── stores/               estado global (Zustand + localStorage)
```

## Problemas comuns

- **"O dono do vídeo não permite reprodução fora do YouTube"** — alguns vídeos (muitos clipes oficiais/VEVO) bloqueiam o embed. Não há o que fazer; o app pula para o próximo automaticamente (dá para desligar nas Configurações).
- **O vídeo aparece mas os botões do app não controlam** — a rede pode estar bloqueando a comunicação com o player. Teste o outro domínio em **Configurações → Player** (`youtube-nocookie.com`). Os controles do próprio vídeo continuam funcionando.
- **Os títulos aparecem como "Vídeo abc123…"** — o oEmbed está bloqueado na sua rede; o título real aparece assim que o vídeo tocar.
- **A busca dá "fetch failed (ENOTFOUND)"** — o servidor do app não consegue sair para a internet sozinho. Rode com `npm run dev:proxy` (veja [Busca em rede corporativa](#busca-em-rede-corporativa-proxy)).
