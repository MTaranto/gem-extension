# Gem Bridge Extension

[Read in English](./README.md)

Gem Bridge Extension é a extensão de navegador complementar ao Gem Bridge.

Seu objetivo é fornecer uma ponte controlada entre assistentes de IA baseados em navegador e o daemon local Gem Bridge por meio de Native Messaging.

A extensão é desenhada em torno destes princípios:

- **Integração local-first**: arquivos locais e ferramentas de desenvolvimento continuam sendo tratados pelo daemon local.
- **Controle do usuário**: ações sensíveis devem ser visíveis, auditáveis e aprovadas pelo usuário.
- **Permissões mínimas**: permissões do navegador devem permanecer o mais restritas possível.
- **Orquestração segura**: fluxos multiagente experimentais devem permanecer protegidos por feature flag e supervisão humana.

## Estágio atual

Este projeto está no estágio inicial de planejamento e estruturação.

O primeiro milestone é validar a comunicação entre:

```text
extensão de navegador
    ↓
background service worker
    ↓
Native Messaging
    ↓
daemon Gem Bridge
```

O fluxo multiagente experimental não faz parte do primeiro MVP.

## Documentação

- [Arquitetura](./docs/GEM_EXTENSION_ARCHITECTURE.pt-br.md)
- [Política de Privacidade](./PRIVACY.pt-br.md)
- [Architecture](./docs/GEM_EXTENSION_ARCHITECTURE.md)
- [Privacy Policy](./PRIVACY.md)

## Estrutura planejada

```text
gem-extension/
├── background/
├── content/
│   └── providers/
├── docs/
├── native_messaging/
│   ├── chrome/
│   └── firefox/
├── popup/
├── shared/
├── manifest.chrome.json
├── manifest.firefox.json
├── PRIVACY.md
├── PRIVACY.pt-br.md
├── README.md
└── README.pt-br.md
```

## Estratégia de desenvolvimento

O projeto deve evoluir de forma incremental.

Primeiros milestones recomendados:

1. Estruturar o repositório.
2. Adicionar manifestos de navegador para desenvolvimento.
3. Validar o popup da extensão.
4. Validar mensagens com o background service worker.
5. Validar Native Messaging com um host local mínimo.
6. Conectar ao daemon Gem Bridge ou a um wrapper dedicado.
7. Adicionar provider adapters somente depois que a ponte local estiver estável.
8. Manter o fluxo multiagente como experimental e desligado por padrão.

## Postura de segurança

Gem Bridge Extension deve ser tratada como uma ferramenta local de alto privilégio para desenvolvimento.

A extensão não deve:

- Solicitar permissões amplas do navegador sem necessidade clara.
- Ler arquivos locais diretamente.
- Enviar conteúdo de arquivos locais para serviços de IA sem aprovação do usuário.
- Acionar tool calls locais silenciosamente.
- Expor execução arbitrária de shell.
- Habilitar automação multiagente experimental por padrão.

O daemon local continua responsável pela validação do workspace e pela execução das ferramentas. A extensão é responsável pela interação com o usuário, orquestração no navegador e transporte até o host nativo.

## Licença

Este projeto está atualmente em desenvolvimento ativo. Uma licença será adicionada antes da primeira release pública.
