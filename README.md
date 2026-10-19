# Catálogo IA — mini SaaS multi-tenant com agente de IA

Plataforma onde empresas cadastram seus produtos e um agente de IA responde perguntas de clientes consultando os dados reais do banco.

O que tem aqui:

- Cadastro e login com JWT, com dois papéis: `admin` e `user`.
- Multi-tenant: cada empresa só enxerga os próprios dados.
- CRUD de produtos (admin escreve, user só lê), com busca, filtros, paginação e upload de imagem.
- Chat com um agente que usa tool calling para consultar os produtos no MongoDB, com resposta em streaming.
- Frontend em React + TypeScript, responsivo, com modo escuro.
- Seed com 2 empresas e mais de 12 produtos cada.
- Testes automatizados (backend e frontend) e Docker Compose.

Stack: Node.js, Express 5, MongoDB (Mongoose), TypeScript no backend e no frontend, React 19 e Vite.

---

## Como rodar (menos de 5 minutos)

Você precisa do Node.js 20 ou mais novo. Para o banco, escolha uma das opções abaixo.

### Opção 1: tudo com Docker

Só precisa do Docker.

```
docker compose up --build
```

Quando subir, em outro terminal popule o banco:

```
docker compose run --rm -e ALLOW_SEED=true api node dist/scripts/seed.js
```

Abra http://localhost:8080.

### Opção 2: Node na sua máquina

1. Instale as dependências (na raiz do projeto):

```
npm install
```

2. Crie o arquivo de configuração da API:

```
cp apps/api/.env.example apps/api/.env
```

Abra o `apps/api/.env` e troque o `JWT_SECRET` por qualquer texto com 32 caracteres ou mais.

3. Suba um MongoDB. Escolha um:

- Com Docker: `docker compose up -d mongo`
- Sem Docker e sem Mongo instalado: `npm run db:memory` (sobe um Mongo em memória na porta 27017; deixe esse terminal aberto; os dados somem quando você fecha, e na primeira vez ele baixa o binário do Mongo)
- Já tem Mongo? Ajuste o `MONGODB_URI` no `.env`.

4. Em outro terminal, popule o banco:

```
npm run seed
```

5. Rode API e frontend juntos:

```
npm run dev
```

Abra http://localhost:5173. A API fica em http://localhost:3333.

### Contas de teste

A senha de todas é `Senha@123`.

- TechStore (notebooks, celulares, áudio...): `admin@techstore.com` e `cliente@techstore.com`
- Casa & Conforto (móveis, cozinha...): `admin@casaconforto.com` e `cliente@casaconforto.com`

Os e-mails que começam com `admin` têm papel de administrador; os que começam com `cliente` são usuários comuns. Para ver o isolamento, entre em cada empresa e pergunte ao assistente por "cadeira": só a Casa & Conforto tem.

### Usando o Claude de verdade

Por padrão o projeto roda com `LLM_PROVIDER=mock`, que não precisa de chave (veja a decisão sobre isso mais abaixo). Para usar o Claude, no `apps/api/.env`:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sua-chave
```

Com Docker, passe as mesmas variáveis ao subir: `LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sua-chave docker compose up --build`.

### Testes

```
npm test
```

Roda os testes do backend (integração com MongoDB em memória, não precisa de nada instalado) e do frontend. Para rodar só um lado: `npm test -w apps/api` ou `npm test -w apps/web`.

---

## Como o projeto está organizado

- `apps/api`: backend.
  - `src/config`: variáveis de ambiente, log e conexão com o banco.
  - `src/shared`: coisas usadas por todos os módulos (erros, autenticação, regra de tenant, rate limit).
  - `src/modules/auth`, `users`, `companies`, `products`, `uploads`, `chat`: um módulo por assunto. Dentro de cada um: rotas, serviço, repositório e modelo.
  - `src/scripts`: seed e Mongo em memória.
  - `tests`: testes de integração.
- `apps/web`: frontend.
  - `src/pages`: telas (login, cadastro, produtos, assistente, equipe).
  - `src/components`: peças reutilizáveis.
  - `src/auth`, `src/theme`: contexto de login e de tema.
  - `src/lib`: cliente da API, leitor de streaming e formatação.

### Endpoints da API

- `POST /auth/register`: cria uma empresa nova e seu primeiro usuário (admin).
- `POST /auth/login` e `GET /auth/me`.
- `GET /users` e `POST /users`: equipe da empresa (só admin).
- `GET /products` (com `q`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`), `GET /products/categories`, `GET /products/:id`: qualquer usuário logado.
- `POST /products`, `PUT /products/:id`, `DELETE /products/:id`: só admin.
- `POST /uploads`: envia imagem de produto (só admin).
- `POST /chat`: recebe `{ message, history? }`. Responde JSON normal ou, se o cabeçalho `Accept: text/event-stream` estiver presente, responde em streaming (SSE).

---

## Decisões e o porquê de cada uma

### Estrutura

**Monorepo com npm workspaces.** API e frontend vivem no mesmo repositório, com um único `npm install` e scripts na raiz. Para um time pequeno isso reduz atrito: uma mudança que mexe nos dois lados vai num commit só. Não usei Turborepo ou Nx porque, com dois pacotes, seria complexidade sem ganho.

**TypeScript no backend (CommonJS).** Pega erro de tipo antes de rodar e deixa o código mais fácil de ler. Compilo para CommonJS porque evita a exigência de escrever `.js` nos imports que o modo ESM do Node faz, e nada neste projeto precisa de ESM.

**Camadas: rota, serviço, repositório.** A rota só cuida de HTTP (ler e validar a entrada, devolver a resposta). O serviço tem a regra de negócio. O repositório é o único que fala com o banco. Assim a mesma busca de produtos serve tanto para a tela quanto para o agente de IA, sem duplicar código.

**Validação com Zod em toda entrada.** Todo dado que vem de fora (body, query, params e até o que o modelo de IA manda para as tools) passa por um schema. Dado inválido vira erro 400 com mensagem clara por campo.

### Multi-tenant (o ponto mais importante)

**Um banco só, com `company_id` em cada documento.** É a forma mais simples de operar e de escalar quando há muitas empresas pequenas. A alternativa (um banco por empresa) isola mais, mas custa caro em conexões e migrações. O risco do modelo que escolhi é esquecer o filtro numa query, e por isso há duas camadas de proteção:

1. **Repositório escopado.** `ProductRepository` recebe o `company_id` no construtor e o aplica em toda operação (listar, buscar por id, criar, editar, apagar). Não existe método sem o filtro, então quem usa não tem como esquecer.
2. **Trava no model (`tenant-guard`).** Um plugin do Mongoose faz qualquer query direta no model sem `company_id` no filtro lançar erro, em vez de devolver dados. Isso cobre o caso de alguém escrever uma query nova sem usar o repositório. Quando cruzar empresas é intencional (login por e-mail, seed), é preciso declarar isso com `skipTenantGuard`, o que fica visível no code review.

**O `company_id` nunca vem do cliente.** Ele nasce no middleware `authenticate`, a partir do usuário guardado no banco. O que o cliente mandar em body, query ou header com esse nome é ignorado (há teste para isso).

**Produto de outra empresa responde 404, não 403.** Um 403 confirmaria que aquele id existe na outra empresa. Com 404 não há como saber.

**Todo índice começa por `company_id`.** Como todo filtro tem esse campo, ele é o melhor prefixo, e as consultas continuam rápidas mesmo com muitos tenants.

### Autenticação e permissões

**O token JWT guarda só o id do usuário.** O papel e a empresa são lidos do banco a cada requisição. O custo é uma busca por id (indexada). O ganho é que mudar o papel ou remover um usuário vale na hora, sem esperar o token expirar. O algoritmo é fixado em HS256 na verificação, o que bloqueia o ataque de "alg: none".

**Cadastro público cria uma empresa nova e seu admin.** É o fluxo normal de um SaaS (a pessoa assina e vira dona da conta). O papel nunca pode ser escolhido no cadastro público. Para ter usuários comuns, o admin os cria na tela "Equipe" (`POST /users`), sempre dentro da própria empresa.

**E-mail único em todo o sistema.** Uma pessoa pertence a uma empresa só. É uma simplificação: um usuário que participa de várias empresas exigiria um modelo de "vínculos", que não coube no escopo.

**Segurança do login.** Senha com bcrypt. Senha errada e e-mail inexistente dão exatamente a mesma resposta e gastam o mesmo tempo (evita descobrir quais e-mails existem). Há limite de tentativas por IP em login e cadastro.

**Permissões por middleware.** `requireRole('admin')` protege escrita de produtos, upload e gestão de equipe. No frontend os botões também somem para usuários comuns, mas isso é só conforto: quem manda de verdade é a API.

**Token no `localStorage` (frontend).** É simples e funciona bem com a API em outro endereço. O custo é que um ataque de XSS poderia roubá-lo. Mitiguei o que dá (React escapa tudo, o markdown do chat não aceita HTML, SVG é bloqueado no upload), mas veja a seção de produção abaixo.

### Agente de IA

**Tool calling de verdade, com o servidor no controle.** O modelo recebe duas ferramentas (`search_products` e `list_categories`). Quando precisa de dados, ele pede a ferramenta, o servidor executa a consulta no MongoDB e devolve o resultado, e o modelo escreve a resposta com base nisso. O laço tem no máximo 5 passos para um modelo em loop não gerar custo infinito.

**O modelo não escolhe a empresa.** As ferramentas não têm nenhum parâmetro de empresa. O `company_id` do usuário logado é amarrado nas ferramentas no servidor. Mesmo que alguém consiga enganar o modelo com um texto malicioso (prompt injection) pedindo dados de outra empresa, a consulta continua escopada. Isso tem teste: um "modelo comprometido" que tenta passar `company_id` de outra empresa recebe só dados da empresa logada.

**Erro de ferramenta volta para o modelo.** Se o modelo mandar parâmetros inválidos, ele recebe a mensagem de erro e pode corrigir e tentar de novo, em vez de a conversa quebrar.

**O prompt trata o texto de produto como dado.** Nome e descrição vêm do banco e poderiam conter instruções ("ignore as regras..."). O prompt avisa explicitamente para ignorá-las, além da proteção estrutural acima.

**Provedor de LLM trocável.** O agente só conhece uma interface pequena (`LlmProvider`). Hoje há o provider do Claude (SDK oficial da Anthropic, modelo `claude-haiku-5-5` por padrão, rápido e barato para esse tipo de tarefa) e o `mock`. Usar OpenAI ou outro seria escrever um arquivo novo, sem mexer no agente.

**Provider `mock` (decisão para você ficar ciente).** Quem corrige o desafio pode não ter uma chave de API. Por isso incluí um provider falso, determinístico, que segue o mesmo caminho do modelo real (pede a ferramenta, recebe o resultado do banco e monta a resposta), só que a interpretação da frase é feita por regras simples. A tela mostra um aviso "Modo demonstração" quando ele está ativo, para não parecer que é IA de verdade. Ele também é o que torna os testes rápidos e sem custo.

**Streaming com SSE.** A resposta aparece aos poucos, e a tela mostra quais consultas ao banco o agente fez ("6 produto(s) encontrado(s)"). Usei SSE e não WebSocket porque o fluxo é só do servidor para o cliente, e SSE passa por proxies sem configuração especial. No frontend leio o stream com `fetch`, porque o `EventSource` do navegador não consegue mandar o cabeçalho de autenticação. Sem o cabeçalho `Accept: text/event-stream`, o mesmo endpoint responde JSON normal, como o desafio pede.

**Conversa sem estado no servidor.** O cliente reenvia as últimas mensagens (limitadas a 20) a cada pergunta. Evita criar tabela de conversas e problema de sincronização. O custo: quem quiser histórico persistente (ver conversas antigas) precisaria de uma coleção própria; deixei para a fase seguinte.

**Limites de custo.** Mensagem de até 1000 caracteres e limite de 20 mensagens por minuto por usuário, porque cada mensagem custa dinheiro.

### Dados

**Busca com índice de texto em português e plano B.** O índice de texto do MongoDB ignora acento e caixa e entende plural ("cadeiras" acha "cadeira"). Quando ele não acha nada (termo parcial como "cadei"), a busca cai para uma busca por trecho. Não usei Elasticsearch ou Atlas Search para não exigir infraestrutura extra.

**Preço como número com 2 casas.** Simples de usar na API e na tela. O jeito mais correto para sistemas financeiros é guardar centavos como inteiro (ou Decimal128), por causa de erros de arredondamento de ponto flutuante. Para um catálogo, que só exibe e filtra preços, acho aceitável, mas registro como dívida consciente.

**Upload de imagem no disco local.** Só admin, até 2 MB, JPG/PNG/WEBP/GIF. SVG é recusado de propósito, porque pode carregar script. Confiro os primeiros bytes do arquivo e não só o tipo informado pelo navegador, e salvo com nome aleatório (ignoro o nome original). Em produção isso iria para um armazenamento de objetos (S3 ou similar).

**Imagens do seed são placeholders.** Usam um serviço externo que desenha o nome do produto (`placehold.co`), então precisam de internet. Se a imagem não carregar, a tela mostra um ícone no lugar.

### Frontend

**Vite + React + TypeScript, sem biblioteca de componentes e sem Tailwind.** O CSS é escrito à mão com variáveis, o que dá controle total do visual e do modo escuro com poucas linhas e nenhuma dependência pesada. Estado de login e tema ficam em Context; não adicionei React Query nem Redux porque as telas são simples e o ganho não pagaria a dependência.

**Proxy `/api`.** Em desenvolvimento o Vite, e no Docker o nginx, encaminham `/api/*` para a API. Para o navegador tudo é a mesma origem, então não há dor de cabeça com CORS nem preocupação com cookies.

**Detalhes de experiência.** Busca com atraso (debounce) para não chamar a API a cada tecla; respostas antigas são descartadas se o filtro mudou; tela de carregamento, vazia e de erro; modal nativo `<dialog>` (acessível); navegação vira barra inferior no celular; o tema escuro respeita a preferência do sistema e não "pisca" no carregamento.

### Testes

**MongoDB em memória nos testes de integração.** Os testes chamam a API de verdade (Supertest) contra um Mongo real em memória, então testam também os índices e a busca de texto. Há testes para: isolamento entre empresas (ler, editar e apagar por id; busca; categorias; chat), permissões por papel, ataques de token (assinatura errada, `alg: none`, expirado), upload malicioso, o laço do agente (erro de tool, loop, falha do LLM) e o streaming. No frontend: leitor de SSE, guards de rota, cartão de produto e tela de chat.

---

## O que eu faria diferente em produção

### Escala

- **Banco:** MongoDB em réplica (isso também permite transações no cadastro, que hoje usa uma compensação manual para não deixar empresa órfã) e avaliar sharding por `company_id` se alguma empresa ficar muito grande. Busca mais avançada (relevância, sinônimos) com Atlas Search ou Elasticsearch.
- **API sem estado e em várias instâncias** atrás de um balanceador. O limite de requisições hoje fica em memória de cada instância; precisaria de Redis para ser compartilhado.
- **Imagens em S3 com CDN**, com URLs assinadas, e não no disco da API.
- **Chat:** fila ou limite de concorrência por empresa para não estourar a cota do provedor, cache das respostas de consultas repetidas, e persistência do histórico de conversas.
- **Preço em centavos (inteiro)** ou Decimal128.

### Segurança

- **Sessão:** token de acesso curto (15 minutos) com refresh token, em cookie `HttpOnly` + `SameSite`, no lugar do token de 1 dia no `localStorage`; possibilidade de revogar sessões.
- **Conta:** confirmação de e-mail, recuperação de senha, política de senha mais forte (e checagem contra senhas vazadas), bloqueio por tentativas por conta (hoje só há por IP) e autenticação em dois fatores para admins.
- **Segredos** em um gerenciador (não em arquivo `.env`), com rotação de chaves.
- **Tenant:** auditoria de acessos, e testes automáticos que percorrem todas as rotas garantindo que nenhuma devolve dado de outra empresa.
- **IA:** filtrar dados sensíveis antes de enviar ao modelo, e monitorar tentativas de prompt injection.
- Varredura de dependências (`npm audit` / Dependabot) e antivírus nos uploads.

### Monitoramento

- Logs já saem em JSON (pino) sem senha nem token; faltaria enviá-los para uma ferramenta central e ligar um id de requisição a cada linha.
- Métricas (taxa de erro, latência, uso de memória) e alertas; rastreamento distribuído (OpenTelemetry) para ver quanto do tempo de uma resposta foi banco e quanto foi LLM.
- Métricas específicas do agente: tokens e custo por empresa, tempo de cada ferramenta, taxa de falha do provedor.
- Endpoint de saúde que também verifica o banco, e backup automático do MongoDB.
- CI rodando testes, checagem de tipos e build a cada push, e deploy automatizado.
