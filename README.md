# Sintonia 🎧

Um "YouTube fora do YouTube": cole links de vídeos, organize em **playlists** e **favoritos** e deixe tocando enquanto trabalha — com um player embutido, fila de reprodução, aleatório, repetir e mini player. E também uma **plataforma de cursos** estilo Udemy: vídeos do YouTube organizados em seções e aulas, com progresso e anotações.

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
- **Cursos** estilo Udemy (veja [como funciona](#7-cursos)):
  - crie a partir de uma **playlist do YouTube** (importa todos os vídeos), de links soltos ou em branco;
  - organize em **seções**: renomeie, reordene, arraste aulas, mova entre seções ou divida uma seção em duas;
  - **sala de aula** com o vídeo, o conteúdo do curso ao lado e as aulas marcadas como concluídas automaticamente;
  - **continua de onde parou** em cada aula, **velocidade** de 0,75x a 2x e **anotações com tempo** (clique no tempo para voltar àquele momento);
  - "Continue aprendendo" no Início, e as aulas não se misturam com a sua biblioteca de músicas.
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
- **Título e canal**: primeiro o app tenta o endpoint público de oEmbed (`youtube.com/oembed`, depois `noembed.com`). Se a rede bloquear, ele pergunta ao próprio player: um segundo player, invisível (a "sonda", em [`src/lib/youtube-prober.ts`](src/lib/youtube-prober.ts)), *prepara* o vídeo sem tocar (`cueVideoById`) e lê o título que o player informa (`videoData`). Você também pode editar o título manualmente.

### 5. Dados no navegador

O estado fica em três *stores* do [Zustand](https://zustand.docs.pmnd.rs) com o middleware `persist`, gravando no `localStorage`:

| Chave | O que guarda |
| --- | --- |
| `sintonia:library` | vídeos, favoritos, playlists, histórico, cursos, progresso das aulas e anotações |
| `sintonia:player` | fila, posição, volume, aleatório/repetir |
| `sintonia:settings` | preferências (domínio do player, luz ambiente…) |

Como o servidor não tem acesso ao `localStorage`, os dados são carregados só depois que a página monta no navegador (veja `StoreHydrator` em [`src/components/providers.tsx`](src/components/providers.tsx)). Isso evita diferenças entre o HTML do servidor e o do navegador ("hydration mismatch").

### 6. Busca sem API

A API oficial de busca do YouTube exige criar um projeto no Google Cloud e gerar uma chave. O app tem dois caminhos que dispensam isso — escolha em **Configurações → Busca**.

#### Pelo Google, no navegador (padrão — funciona com o youtube.com bloqueado)

O Google oferece de graça a [Programmable Search Element](https://developers.google.com/custom-search/docs/element): um script (`cse.google.com/cse.js`) que coloca uma busca do Google dentro de qualquer site. Ele roda **no seu navegador**, pelo mesmo caminho que você já usa para pesquisar no Google. Em vez de mostrar o visual padrão, o app usa os *callbacks* do script: quando os resultados chegam, o Google entrega a lista (link, título e os metadados do vídeo que ele indexou: duração, canal, visualizações, miniatura) e o app desenha do seu jeito. Veja [`src/lib/google-cse.ts`](src/lib/google-cse.ts).

Configuração (uma vez só):

1. Abra o [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create) com qualquer conta Google.
2. Dê um nome e, em **“O que pesquisar?”**, escolha **“Pesquisar em sites ou páginas específicas”** e adicione `youtube.com`.
3. Clique em **Criar** e copie o **ID do mecanismo de pesquisa** (ou o código `<script>` inteiro).
4. Cole na tela **Buscar** do app (ou em Configurações → Busca).

O visual padrão do Google (inclusive a janela de "Sobreposição", layout padrão dos mecanismos novos) fica sempre escondido pelo app — veja as regras `.gsc-*` em [`globals.css`](src/app/globals.css).

Esse ID (o `cx`) **não é uma chave de API** e não envolve cobrança. A opção gratuita de mecanismos restritos a sites específicos continua disponível (o que o Google está encerrando é a busca na web inteira).

Sem configurar nada, o botão **Abrir no Google** pesquisa vídeos do YouTube no Google em outra aba; copie o link do vídeo e cole no app com `Ctrl+V`. O app entende inclusive os links "embrulhados" do Google (`google.com/url?...&url=...youtube.com/watch...`).

#### Direto no YouTube, pelo servidor do app

O app chama o mesmo endpoint interno que o site do YouTube usa para pesquisar (`youtubei/v1/search`) e, se falhar, lê o JSON embutido na página `youtube.com/results`. Veja [`src/lib/youtube-search.ts`](src/lib/youtube-search.ts).

Isso precisa rodar no **servidor** (a rota [`/api/search`](src/app/api/search/route.ts)), porque o navegador não pode ler respostas de `youtube.com` vindas de outro site — é a regra de segurança chamada **CORS**. Consequência: quem precisa alcançar o youtube.com é o computador que roda o `npm run dev`. Em redes que bloqueiam o YouTube, use a busca pelo Google.

Se a sua rede libera o YouTube mas exige proxy, rode `npm run dev:proxy` (ou `npm run build && npm run start:proxy`): o script liga o suporte a proxy do Node (`--use-env-proxy`, Node 22.21+ ou 24+), usa os certificados do sistema (`--use-system-ca`) e, sem `HTTPS_PROXY` definido, reaproveita o proxy do npm (`npm config get https-proxy`).

> ⚠️ Limpar os dados do navegador apaga sua biblioteca. Use **Configurações → Exportar backup** de vez em quando.

### 7. Cursos

Um curso é uma lista de **seções**, e cada seção tem **aulas** (uma aula = um vídeo do YouTube, com título opcional próprio). Tudo fica no mesmo store da biblioteca, então entra no backup.

- **Importar playlist sem API**: o app abre a playlist num player invisível (`/embed/videoseries?list=…`). Com uma playlist carregada, o player informa a lista de IDs dos vídeos (campo `playlist` das mensagens) — é o mesmo canal de `postMessage` usado para controlar o vídeo. Depois a sonda descobre o título e a duração de cada um.
- **Aulas fora da biblioteca de músicas**: os vídeos adicionados só por causa de um curso ganham a marca `courseOnly`. Eles continuam servindo de "cache" de título e duração, mas não aparecem na Biblioteca. Excluir o curso apaga esses registros; vídeos que também estão na biblioteca ficam.
- **Vídeo encaixado na sala de aula**: o iframe continua sendo um só (ver item 3). A sala de aula oferece um "palco" (`usePlayerDock`) e o `PlayerHost` se posiciona exatamente em cima dele; ao sair da página, o vídeo volta para o mini player sem recarregar.
- **Progresso**: o [`BackgroundSync`](src/components/background-sync.tsx) salva a posição a cada 5 s, marca a aula como concluída ao chegar em 95% (ou no fim) e registra a última aula aberta. Ao tocar uma aula, o player começa do ponto salvo (`loadVideoById` com `startSeconds`).
- **Velocidade**: comando `setPlaybackRate` do player, reaplicado a cada vídeo novo.

## Estrutura

```text
src/
├── app/                  rotas (início, busca, biblioteca, favoritos, playlists, cursos)
├── components/
│   ├── ui/               componentes shadcn/ui
│   ├── player/           iframe, barra do player, fila, "Tocando agora"
│   ├── video/            lista, cards, menus de contexto
│   ├── courses/          cursos: lista, sala de aula, editor, anotações, importação
│   ├── dialogs/          adicionar vídeo, playlist, configurações, atalhos
│   └── layout/           barra lateral e topo
├── lib/
│   ├── youtube.ts        parser de links, miniaturas, oEmbed
│   ├── youtube-bridge.ts protocolo postMessage com o player
│   ├── youtube-prober.ts player invisível que lê playlists e títulos
│   ├── courses.ts        regras dos cursos (progresso, próxima aula, tocar aula)
│   ├── google-cse.ts     busca pelo Google no navegador (Programmable Search Element)
│   ├── youtube-search.ts busca direta no YouTube (roda no servidor)
│   └── actions.ts        ações de alto nível (favoritar, tocar, backup…)
└── stores/               estado global (Zustand + localStorage)
```

## Problemas comuns

- **"O dono do vídeo não permite reprodução fora do YouTube"** — alguns vídeos (muitos clipes oficiais/VEVO) bloqueiam o embed. Não há o que fazer; o app pula para o próximo automaticamente (dá para desligar nas Configurações).
- **O vídeo aparece mas os botões do app não controlam** — a rede pode estar bloqueando a comunicação com o player. Teste o outro domínio em **Configurações → Player** (`youtube-nocookie.com`). Os controles do próprio vídeo continuam funcionando.
- **Os títulos aparecem como "Vídeo abc123…"** — o oEmbed está bloqueado na sua rede; o título real aparece assim que o vídeo tocar.
- **A busca dá "fetch failed (ENOTFOUND)"** — você está no modo "Direto no YouTube" e o servidor do app não alcança o youtube.com. Troque para **Google** em Configurações → Busca.
- **Depois de atualizar o projeto, alguma mudança visual não apareceu** — apague a pasta `.next` e rode `npm run dev` de novo (ela guarda o resultado de compilações antigas).
- **A busca pelo Google não carrega** — confira o ID do mecanismo; se `cse.google.com` estiver bloqueado na rede, use **Abrir no Google** e cole o link no app.
- **A importação da playlist não encontrou vídeos** — a playlist precisa ser pública ou não listada, e o link precisa ter o trecho `list=…`. Se a sua rede bloquear também o `/embed/videoseries`, crie o curso a partir de links.
