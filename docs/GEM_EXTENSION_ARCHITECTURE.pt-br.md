# Arquitetura da Gem Extension — V2

[Read in English](./GEM_EXTENSION_ARCHITECTURE.md)

## Status do documento

- Projeto relacionado: **Gem Bridge**
- Componente: **Gem Extension**
- Versão arquitetural: **V2**
- Status: **rascunho técnico inicial**
- Idioma desta versão: **português brasileiro**

Este documento descreve a arquitetura proposta para a **Gem Extension**, a extensão de navegador que deverá permitir a comunicação controlada entre assistentes de IA baseados em navegador e o daemon local **Gem Bridge**.

A V2 refina a proposta inicial, separando claramente o núcleo necessário para o daemon da camada experimental de orquestração multiagente.

---

## 1. Visão geral executiva

A Gem Extension é a ponte de navegador do ecossistema Gem Bridge.

Seu objetivo principal é permitir que um assistente de IA executado em uma aba do navegador solicite operações controladas ao daemon local Gem Bridge, sem receber acesso irrestrito ao computador do usuário.

A extensão deve atuar como uma **cabine de comando segura**, não como uma automação invisível.

A arquitetura separa dois eixos:

1. **Eixo principal: integração local segura**
   - Comunicação entre extensão e daemon via Native Messaging.
   - Envio de requisições estruturadas para ferramentas do Gem Bridge.
   - Exibição de respostas, erros e solicitações de aprovação ao usuário.
   - Preservação do modelo security-first do Gem Bridge.

2. **Eixo experimental: orquestração multiagente**
   - Coordenação entre duas abas de IA, como ChatGPT e Gemini.
   - Captura da resposta final de uma IA.
   - Preparação ou injeção da resposta na outra IA.
   - Controle por turnos, `maxTurns`, pausa, retomada e intervenção humana.
   - Painel Spectator para auditoria ao vivo.

A camada multiagente é considerada um recurso experimental. Ela deve depender do núcleo seguro da extensão, mas não deve bloquear o desenvolvimento da ponte essencial entre navegador e daemon.

---

## 2. Decisão de produto: nome

O nome provisório **Gem Extension** é tecnicamente bom e combina com o ecossistema Gem Bridge.

Ele comunica que a extensão faz parte da família Gem e que é uma dependência do fluxo browser-to-daemon.

Recomendação atual:

```text
Nome técnico interno: gem-extension
Nome de repositório: gem-extension
Nome público inicial: Gem Extension
Nome comercial futuro possível: Gem Bridge Extension
```

### Motivo

`gem-extension` é curto, simples e bom para repositório, comandos, pastas e documentação técnica.

`Gem Bridge Extension` é melhor para comunicação pública, porque deixa claro que a extensão pertence ao Gem Bridge e não é uma extensão genérica qualquer.

Portanto, a estratégia recomendada é:

- Usar **gem-extension** no código, repositório e pacotes.
- Usar **Gem Bridge Extension** em README, páginas públicas e material de apresentação.

---

## 3. Decisão de repositório

A recomendação é manter a Gem Extension em um **repositório separado** do Gem Bridge.

```text
gem-bridge        -> daemon local em Go
gem-extension     -> extensão de navegador em JavaScript/TypeScript
```

### Por que separar

O Gem Bridge e a Gem Extension têm ciclos de vida diferentes.

O daemon é um binário local em Go, com foco em filesystem, Git, comandos controlados, workspace e segurança de execução local.

A extensão é um projeto de navegador, com Manifest V3, content scripts, background service worker, permissões, DOM, Native Messaging, empacotamento e compatibilidade entre navegadores.

Separar os repositórios mantém:

- histórico Git mais limpo;
- CI mais simples;
- issues e milestones mais focados;
- versionamento independente;
- publicação futura mais organizada;
- melhor separação mental entre daemon e extensão.

### O que deve ficar compartilhado

Mesmo em repositórios separados, os dois projetos devem compartilhar contrato e documentação.

Opções futuras:

```text
gem-protocol/                -> especificação de mensagens, schemas e exemplos
docs/integration/            -> documentação de integração cruzada
shared JSON schemas          -> versionamento do protocolo
```

No estágio inicial, basta duplicar uma documentação pequena de protocolo nos dois repositórios e manter o contrato simples.

---

## 4. Relação com o Gem Bridge atual

A Gem Extension pode começar a ser rascunhada agora.

O Gem Bridge não precisa estar completo para isso, mas precisa manter uma direção estável em três pontos:

1. **Formato de requisição e resposta**
   - A extensão precisa saber como enviar tool calls.
   - O daemon precisa responder em JSON estruturado.

2. **Modo de transporte**
   - O Gem Bridge atual é CLI.
   - Native Messaging exige leitura e escrita por `stdin`/`stdout` com framing específico.
   - Portanto, será necessário criar um modo nativo ou um wrapper.

3. **Modelo de segurança**
   - A extensão não deve contornar as regras do daemon.
   - Toda operação sensível deve continuar sendo validada pelo Gem Bridge.

### Recomendação prática

Começar a Gem Extension em paralelo é uma boa decisão, desde que o primeiro MVP seja pequeno.

O primeiro objetivo não deve ser Maya conversando com Gaia automaticamente.

O primeiro objetivo deve ser:

```text
popup da extensão
    ↓
mensagem Native Messaging
    ↓
gem-bridge ou wrapper nativo
    ↓
resposta JSON
    ↓
popup mostra resultado
```

Esse MVP valida o túnel local antes de automatizar abas de IA.

---

## 5. Escopo da V2

A V2 divide o escopo em três camadas.

### 5.1 Camada obrigatória: Browser-to-Daemon Bridge

Esta é a razão principal da extensão.

Responsabilidades:

- Registrar a extensão no navegador.
- Conectar ao host nativo do Gem Bridge.
- Enviar requisições estruturadas.
- Receber respostas estruturadas.
- Exibir erros de conexão, execução e permissão.
- Encaminhar respostas para a UI da extensão.
- Nunca conversar diretamente com o filesystem.

### 5.2 Camada assistiva: integração com abas de IA

Responsabilidades:

- Detectar páginas suportadas, como ChatGPT e Gemini.
- Capturar texto de respostas geradas.
- Preparar prompts enriquecidos com contexto local.
- Permitir que o usuário injete texto no campo de prompt.
- Preferir revisão humana antes do envio automático.

### 5.3 Camada experimental: orquestração multiagente

Responsabilidades:

- Registrar duas abas participantes.
- Controlar qual IA fala em cada turno.
- Aplicar `maxTurns`.
- Pausar, retomar e intervir.
- Mostrar transcript e log no painel Spectator.
- Exigir aprovação para tool calls.

Essa camada deve ser feature-flagged desde o começo.

```text
experimental.multiAgent = false por padrão
```

---

## 6. Topologia proposta

```text
Browser AI tab
    ↓ content script / provider adapter
Gem Extension background service worker
    ↓ native messaging client
Gem Bridge native host mode or wrapper
    ↓ internal tools
Authorized workspace
```

Para multiagente:

```text
AI tab A
    ↓ provider adapter A
background orchestrator
    ↓ provider adapter B
AI tab B

Spectator UI observa e controla o loop.
```

---

## 7. Componentes principais

### 7.1 Background service worker

Responsabilidades:

- Roteamento de mensagens entre popup, content scripts e host nativo.
- Controle da sessão atual.
- Validação inicial de mensagens.
- Controle de tool calls pendentes.
- Comunicação com Native Messaging.
- Persistência de estado crítico em storage.
- Coordenação do modo multiagente.

Importante: o service worker não deve depender apenas de variáveis globais para estado crítico, porque o navegador pode encerrar o worker quando ele fica ocioso.

Estado recomendado:

```text
chrome.storage.session ou browser.storage.session:
  sessionId
  activeWorkspaceLabel
  connectedTabs
  debateState
  currentTurn
  maxTurns
  pendingMessage
  pendingApproval
  transcriptSummary
```

Estado volátil aceitável:

```text
nativePort
lastHeartbeatAt
observerDebounceTimers
currentlyProcessingMessage
```

### 7.2 Native client

Responsável por encapsular a comunicação Native Messaging.

Funções esperadas:

```text
connectNativeHost()
disconnectNativeHost()
sendToolRequest(request)
handleNativeResponse(response)
handleDisconnect(error)
```

A extensão não deve conhecer detalhes de filesystem, Git ou comandos. Ela só envia mensagens estruturadas ao daemon.

### 7.3 Router

Responsável por rotear mensagens internas.

Exemplos:

```text
popup -> background -> native host
content script -> background -> approval flow
background -> content script -> inject prompt
background -> spectator ui -> update state
```

### 7.4 Provider adapters

Cada IA suportada deve ter um adaptador próprio.

```text
content/providers/chatgpt_adapter.js
content/providers/gemini_adapter.js
content/providers/base_adapter.js
```

Contrato mínimo de um provider adapter:

```text
detectPage()
isGenerating()
getLastAssistantMessage()
injectPrompt(text)
submitPrompt()
focusPrompt()
```

Motivo: páginas como ChatGPT e Gemini podem mudar DOM, classes, botões e estrutura interna. Isolar adaptadores reduz o dano quando um provedor muda a interface.

### 7.5 Spectator UI

O Spectator UI é uma camada de controle humano.

Funções:

- Mostrar status da conexão com o daemon.
- Mostrar qual aba/IA está ativa.
- Mostrar turno atual.
- Mostrar limite `maxTurns`.
- Mostrar tool calls pendentes.
- Mostrar logs resumidos.
- Pausar debate.
- Retomar debate.
- Intervir com instrução humana.
- Encerrar sessão.
- Exigir aprovação antes de operações sensíveis.

O Spectator UI não deve ser tratado como enfeite visual. Ele é parte do modelo de segurança.

---

## 8. Protocolo de mensagens

### 8.1 Mensagem interna da extensão

```json
{
  "type": "tool.request",
  "requestId": "uuid",
  "source": "popup|content|spectator|orchestrator",
  "payload": {
    "tool": "readFile",
    "args": {
      "path": "README.md"
    }
  }
}
```

### 8.2 Tool call vinda de uma IA

Não se deve aceitar qualquer JSON solto no texto de uma IA.

A chamada deve usar envelope explícito:

```json
{
  "gemBridgeToolCall": true,
  "version": 1,
  "requestId": "uuid",
  "tool": "readFile",
  "args": {
    "path": "README.md"
  },
  "reason": "Need to inspect the project README before answering.",
  "requiresApproval": true
}
```

Regras:

- O schema precisa ser validado.
- A ferramenta precisa estar em allowlist.
- Paths continuam sendo validados no daemon.
- Tool calls vindas de conteúdo de IA devem exigir aprovação no início do projeto.
- Tool calls escondidas em texto de arquivo, diff ou resposta anterior não devem ser executadas automaticamente.

### 8.3 Resposta do daemon

```json
{
  "requestId": "uuid",
  "success": true,
  "data": "..."
}
```

Erro:

```json
{
  "requestId": "uuid",
  "success": false,
  "error": "access outside the workspace is blocked"
}
```

---

## 9. Native Messaging

Native Messaging será o transporte preferencial para a comunicação segura entre a extensão e o Gem Bridge.

O host nativo deve usar `stdio` e mensagens JSON com framing de tamanho conforme o protocolo do navegador.

O Gem Bridge atual é um protótipo CLI que recebe JSON como argumento. Para Native Messaging, existem duas opções:

### Opção A: modo nativo dentro do Gem Bridge

```bash
gem-bridge native-host --workspace /path/to/project
```

Vantagens:

- Menos binários.
- Menos duplicação.
- Protocolo direto dentro do projeto principal.

Desvantagens:

- Mistura transporte Native Messaging no binário principal.
- Exige cuidado para preservar a simplicidade da CLI.

### Opção B: wrapper nativo

```text
gem-bridge-native-host
    ↓
lê Native Messaging
    ↓
chama internamente o core do Gem Bridge
    ↓
devolve resposta Native Messaging
```

Vantagens:

- Mantém CLI simples.
- Isola protocolo de navegador.
- Facilita testes específicos do host nativo.

Desvantagens:

- Mais um binário ou entrypoint.
- Mais empacotamento.

### Decisão recomendada

Começar com um wrapper ou subcomando pequeno, mantendo o core desacoplado.

No longo prazo, o ideal é extrair request/response e dispatcher para pacotes internos reutilizáveis:

```text
internal/protocol
internal/dispatcher
internal/transport/native
```

---

## 10. Segurança

A extensão deve seguir a mesma filosofia do Gem Bridge: todo input vindo de IA é não confiável.

### Regras obrigatórias

- Não executar shell arbitrário.
- Não aceitar comandos livres da IA.
- Não aceitar paths absolutos como algo válido.
- Não confiar em JSON encontrado em respostas de IA sem envelope e validação.
- Não enviar tool call ao daemon sem schema válido.
- Não injetar automaticamente conteúdo em outra IA sem respeitar pausa, limite e estado da sessão.
- Não conceder permissões amplas sem necessidade.
- Não usar host permissions como `*://*.google.com/*` quando domínios mais específicos bastarem.

### Permissões recomendadas inicialmente

```json
{
  "permissions": ["nativeMessaging", "storage"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]
}
```

A permissão `scripting` só deve entrar se houver injeção programática real.

A permissão `activeTab` pode ser útil para ações manuais, mas não substitui host permissions quando há content scripts automáticos.

---

## 11. Manifestos por navegador

A extensão deve evitar assumir que um único manifesto será perfeito para Chrome, Brave, Edge e Firefox.

Estratégia recomendada:

```text
manifest.chrome.json
manifest.firefox.json
```

Ou:

```text
manifest.base.json
scripts/build-manifest.js
```

Diferenças esperadas:

- Chrome usa `allowed_origins` no manifesto do host nativo.
- Firefox usa `allowed_extensions`.
- Firefox exige ID explícito via `browser_specific_settings.gecko.id`.
- Diretórios de instalação do manifesto nativo variam por navegador e sistema operacional.

---

## 12. Estrutura de diretórios recomendada

```text
gem-extension/
  README.md
  README.pt-br.md
  manifest.chrome.json
  manifest.firefox.json
  package.json

  docs/
    ARCHITECTURE.md
    ARCHITECTURE.pt-br.md
    SECURITY_MODEL.md
    SECURITY_MODEL.pt-br.md
    PROTOCOL.md
    PROTOCOL.pt-br.md

  background/
    service_worker.js
    native_client.js
    router.js
    state_store.js
    approvals.js
    orchestrator.js

  content/
    main.js
    spectator_ui.js
    spectator_ui.css

  content/providers/
    base_adapter.js
    chatgpt_adapter.js
    gemini_adapter.js

  popup/
    index.html
    popup.js
    popup.css

  shared/
    constants.js
    message_types.js
    tool_protocol.js
    validation.js

  native_messaging/
    chrome/
      com.gembridge.daemon.json
    firefox/
      com.gembridge.daemon.json

  tests/
    unit/
    fixtures/
```

---


## 13. Estratégia de distribuição, revisão de loja e instalação local

A Gem Extension deve ser tratada como uma extensão de **alto privilégio**, mesmo quando seu objetivo for legítimo e local-first.

O risco principal não é a existência de Native Messaging em si, pois esse é um recurso oficial das extensões modernas. O risco está na combinação de fatores:

- acesso mediado a arquivos locais;
- automação ou injeção em páginas de IA;
- possibilidade de enviar conteúdo local para serviços externos escolhidos pelo usuário;
- permissões de navegador amplas demais;
- tool calls acionadas sem aprovação explícita;
- comportamento invisível ou difícil de auditar.

Por isso, o MVP da extensão deve priorizar uso local em modo de desenvolvimento/unpacked. Publicação em loja não deve ser objetivo inicial.

### 13.1 Estratégia para o MVP

Para o MVP, a extensão deve ser instalada localmente pelo desenvolvedor, sem depender da Chrome Web Store, Firefox Add-ons ou outra loja.

Objetivos do MVP:

- validar o túnel extensão ⇄ daemon;
- validar o registro do host nativo;
- validar o protocolo de mensagens;
- validar logs, erros e fluxos de aprovação;
- manter permissões mínimas;
- evitar automação multiagente automática no começo.

O primeiro MVP deve provar que a extensão consegue chamar o Gem Bridge localmente com segurança antes de tentar automatizar abas de IA.

### 13.2 Estratégia para revisão futura de loja

Antes de qualquer tentativa de publicação pública, o projeto deve possuir documentação explícita sobre:

- por que a extensão precisa de cada permissão;
- quais domínios ela acessa;
- como o usuário autoriza acesso ao daemon local;
- como o workspace limita o acesso a arquivos;
- se algum conteúdo local pode ser enviado a serviços externos;
- quais ações exigem aprovação humana;
- como desativar a extensão, o daemon e o modo experimental.

A descrição pública não deve sugerir que a IA tem acesso direto ao computador. A descrição correta é que o usuário opera uma ponte local, controlada e auditável, restrita ao workspace autorizado.

### 13.3 Permissões mínimas

A extensão deve evitar permissões amplas como:

```json
"host_permissions": ["*://*/*"]
```

A preferência inicial deve ser por domínios específicos:

```json
"host_permissions": [
  "https://chatgpt.com/*",
  "https://gemini.google.com/*"
]
```

Permissões como `nativeMessaging`, `storage`, `tabs`, `activeTab` ou `scripting` devem ser adicionadas somente quando houver necessidade clara e documentada.

### 13.4 Modo multiagente como recurso experimental

O modo Maya ⇄ Gaia deve ser considerado experimental e deve permanecer:

- desligado por padrão;
- protegido por feature flag;
- limitado por `maxTurns` obrigatório;
- visível no Spectator UI;
- interrompível por pause e kill switch;
- registrado em transcript local;
- dependente de aprovação humana para qualquer envio de conteúdo local.

A extensão nunca deve enviar automaticamente conteúdo de arquivos locais para uma IA sem que o usuário veja e aprove a ação.

### 13.5 Instalação local

O desenvolvimento deve assumir instalação local da extensão:

- Chromium/Chrome/Brave: modo desenvolvedor e carregamento da pasta unpacked.
- Firefox: instalação temporária via `about:debugging` durante desenvolvimento.

Essa estratégia reduz dependência de lojas durante a fase de pesquisa, evita bloqueios prematuros e permite evoluir a segurança antes de qualquer distribuição pública.

### 13.6 Documentação adicional obrigatória antes de distribuição

Antes de publicação pública, o projeto deve incluir pelo menos:

```text
README.md
SECURITY_MODEL.md
PRIVACY.md
GEM_EXTENSION_ARCHITECTURE.md
```

A política de privacidade deve deixar claro que o projeto não possui servidor próprio coletando dados, que o daemon roda localmente e que conteúdo local só deve ser enviado a uma IA mediante ação ou aprovação do usuário.

## 14. Roadmap incremental

### MVP 1 — extensão conversa com host nativo

Objetivo:

```text
popup -> background -> Native Messaging -> daemon/wrapper -> popup
```

Critérios de pronto:

- Botão no popup envia uma requisição de teste.
- Host nativo responde com JSON.
- Erros aparecem de forma legível.
- Logs de conexão são visíveis.

### MVP 2 — chamada real `readFile`

Objetivo:

```text
popup pede README.md
Gem Bridge lê arquivo dentro do workspace
popup mostra resposta
```

Critérios de pronto:

- `readFile` funciona.
- Erros de path inseguro são exibidos.
- Resposta grande é tratada com limite.

### MVP 3 — injeção manual em uma aba de IA

Objetivo:

```text
usuário escolhe aba
extensão prepara prompt
usuário revisa
extensão injeta no campo de prompt
usuário envia manualmente
```

Critérios de pronto:

- Adaptador de ChatGPT ou Gemini funciona isoladamente.
- A extensão não envia automaticamente sem o usuário.

### MVP 4 — captura de resposta

Objetivo:

```text
content script detecta resposta final
extrai texto
mostra no Spectator UI
```

Critérios de pronto:

- Observer detecta fim de geração com estabilidade razoável.
- Transcript básico é mantido.

### MVP 5 — relay semi-automático entre duas IAs

Objetivo:

```text
IA A responde
usuário aprova envio para IA B
extensão injeta
usuário envia ou autoriza envio
```

Critérios de pronto:

- Duas abas registradas.
- Estado da sessão persistido.
- Pausa e intervenção funcionam.

### MVP 6 — debate experimental controlado

Objetivo:

```text
IA A <-> IA B com maxTurns, pause, resume, intervene
```

Critérios de pronto:

- `maxTurns` obrigatório.
- Auto-pause ao atingir o limite.
- Kill switch disponível.
- Tool calls exigem aprovação.
- Transcript exportável.

---

## 15. Não objetivos da V2

A Gem Extension não deve, nesta fase:

- automatizar envio ilimitado entre IAs;
- executar tool calls sem aprovação;
- contornar o modelo de segurança do Gem Bridge;
- aceitar shell livre;
- tentar suportar muitos provedores de IA ao mesmo tempo;
- prometer compatibilidade total com qualquer mudança de DOM dos provedores;
- armazenar segredos em texto puro;
- fazer scraping amplo fora das páginas explicitamente suportadas;
- operar fora dos domínios autorizados.

---

## 16. Visão de longo prazo

A visão de longo prazo é transformar a Gem Extension em uma interface segura de orquestração local.

```text
Usuário
    ↓
Gem Extension
    ↓
Gem Bridge
    ↓
workspace autorizado
```

E, em modo experimental:

```text
Maya
    ↓
Gem Extension Spectator + Orchestrator
    ↓
Gaia
    ↓
Gem Extension
    ↓
Maya
```

O ponto central é que o usuário continua no comando.

A extensão não deve dar autonomia irrestrita às IAs. Ela deve dar ao usuário uma cabine de comando para orquestrar IAs com acesso local controlado, auditável e reversível.

---

## 17. Referências técnicas

- Chrome Native Messaging documentation: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Firefox Native Messaging documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
- Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome content scripts documentation: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome extension permissions documentation: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
