# Política de Privacidade da Gem Extension

[Read in English](./PRIVACY.md)

## Status do documento

- Projeto relacionado: **Gem Bridge**
- Componente: **Gem Extension**
- Status: **rascunho inicial para desenvolvimento local**
- Idioma desta versão: **português brasileiro**

Este documento descreve os princípios de privacidade planejados para a Gem Extension.

A Gem Extension ainda está em fase inicial de arquitetura e desenvolvimento. Esta política deve evoluir junto com o projeto antes de qualquer publicação pública.

## 1. Princípio central

A Gem Extension deve seguir o princípio **local-first**.

Isso significa que a extensão deve existir para conectar o navegador do usuário ao daemon local Gem Bridge, sem criar um serviço remoto próprio para coletar, armazenar ou processar dados do usuário.

## 2. Coleta de dados pelo projeto

O projeto Gem Extension, por padrão, não deve operar servidor próprio de coleta de dados.

A extensão não deve enviar dados para servidores do projeto Gem Bridge ou Gem Extension, a menos que uma funcionalidade futura seja criada, documentada e aprovada explicitamente pelo usuário.

## 3. Dados locais

A extensão pode lidar com dados locais durante seu funcionamento, incluindo:

- nomes de arquivos dentro do workspace autorizado;
- conteúdo de arquivos retornados pelo daemon Gem Bridge;
- saídas de ferramentas como `gitStatus` e `gitDiff`;
- mensagens de erro do daemon;
- estado de sessão da extensão;
- preferências do usuário;
- logs locais de auditoria, se implementados.

Esses dados devem permanecer locais por padrão.

## 4. Envio de conteúdo para assistentes de IA

A Gem Extension pode facilitar o envio de contexto local para um assistente de IA escolhido pelo usuário, como ChatGPT ou Gemini.

Esse envio não deve acontecer de forma invisível.

Regra central:

```text
Nenhum conteúdo local deve ser enviado automaticamente para uma IA sem visibilidade e aprovação do usuário.
```

O usuário deve conseguir revisar, cancelar ou editar o conteúdo antes do envio, especialmente quando o conteúdo vier de arquivos locais, diffs Git, logs ou respostas do daemon.

## 5. Native Messaging

A Gem Extension pode usar Native Messaging para se comunicar com o daemon local Gem Bridge.

Essa comunicação deve ser usada apenas para enviar requisições estruturadas e receber respostas estruturadas do daemon.

O daemon Gem Bridge continua responsável por impor a fronteira de segurança do workspace, bloquear paths inseguros e recusar operações não permitidas.

## 6. Workspace autorizado

A extensão não deve tratar o computador inteiro como área acessível.

As operações locais devem ser restritas ao workspace autorizado configurado no Gem Bridge.

O daemon deve rejeitar:

- paths absolutos;
- path traversal;
- escapes por symlink;
- paths fora do workspace;
- comandos arbitrários de shell;
- operações sensíveis sem regras explícitas.

## 7. Modo multiagente experimental

O modo multiagente, como uma conversa orquestrada entre Maya e Gaia, deve ser considerado experimental.

Esse modo deve permanecer:

- desligado por padrão;
- protegido por feature flag;
- limitado por `maxTurns` obrigatório;
- visível no Spectator UI;
- interrompível por pause e kill switch;
- dependente de aprovação humana para envio de conteúdo local.

## 8. Armazenamento local

A extensão pode usar armazenamento local ou de sessão do navegador para guardar:

- preferências;
- feature flags;
- estado de sessão;
- IDs de abas conectadas;
- `maxTurns`;
- logs locais;
- registros de aprovação.

Esses dados devem ser mínimos e voltados à operação da extensão.

## 9. Permissões

A extensão deve solicitar apenas permissões necessárias.

Permissões amplas devem ser evitadas.

A preferência inicial é usar host permissions específicas, como:

```json
{
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]
}
```

Cada permissão deve ter justificativa documentada.

## 10. Controle do usuário

A Gem Extension deve oferecer controles claros para o usuário:

- conectar ou desconectar o daemon;
- aprovar ou negar tool calls;
- pausar fluxos assistidos;
- acionar kill switch;
- revisar conteúdo antes de envio;
- desativar recursos experimentais.

## 11. Alterações futuras

Esta política deve ser atualizada sempre que a extensão passar a lidar com novos tipos de dados, novos domínios, novos fluxos de envio ou novas capacidades de automação.

Antes de qualquer publicação pública, esta política deve ser revisada e alinhada com o comportamento real da extensão.
