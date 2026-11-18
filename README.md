# Reviver Conecta

**Sistema de Inscrições e Vagas da ONG Reviver Capão** (MVP).

[![CI](https://github.com/onoue9/reviver-conecta/actions/workflows/ci.yml/badge.svg)](https://github.com/onoue9/reviver-conecta/actions/workflows/ci.yml)

## O problema

A ONG Reviver Capão oferece cursos gratuitos para a comunidade do Capão Redondo, na zona sul de São Paulo. Hoje as inscrições chegam por WhatsApp, papel e planilhas soltas. Por isso:

- não dá para saber em tempo real quantas vagas ainda restam em cada turma;
- a mesma pessoa se inscreve duas vezes ou fica sem resposta;
- quando alguém desiste, não existe uma lista de espera justa, por ordem de chegada, para chamar o próximo;
- dados pessoais ficam espalhados, sem controle de acesso nem consentimento (LGPD).

O Reviver Conecta centraliza cursos, turmas, inscrições e lista de espera num app web simples, que funciona bem no celular.

## Público

| Quem | O que faz no sistema |
| --- | --- |
| **Comunidade** (jovens, adultos e responsáveis) | Vê os cursos e turmas abertas, se inscreve pelo celular sem criar conta e, se a turma estiver lotada, entra na lista de espera. |
| **Equipe da ONG** (coordenação e voluntários) | Entra no painel com e-mail e senha, acompanha inscritos e vagas por turma e cancela inscrições. Quando uma vaga é liberada, o próximo da lista de espera é confirmado automaticamente. |

## Funcionalidades do MVP

- Catálogo de cursos ativos com turmas abertas e vagas disponíveis.
- Inscrição com consentimento LGPD; vaga confirmada na hora, ou lista de espera quando a turma está cheia.
- Bloqueio de inscrição duplicada na mesma turma.
- Painel da equipe: inscritos, lista de espera, cancelamento com promoção automática.
- PWA: instalável e com cache offline dos arquivos do app.

## Pilha

- **Angular 21** com componentes standalone, signals, zoneless e rotas lazy.
- **Angular Material 3** para a interface.
- **@angular/pwa** (service worker e manifest).
- **Firebase** via **@angular/fire**: **Cloud Firestore** (dados) e **Firebase Auth** (anônimo para alunos, e-mail/senha para a equipe).
- **Firestore Security Rules** que negam tudo por padrão.
- **Vitest** para os testes unitários (`ng test`).
- **GitHub Actions**: `npm ci`, `ng build` e `ng test` a cada push e pull request.

### Arquitetura

```
src/app/
├── features/        # Telas (componentes standalone)
│   ├── cursos/      #   catálogo de cursos e turmas
│   ├── inscricao/   #   formulário de inscrição
│   └── painel/      #   login e painel da equipe
├── services/        # Regras de negócio
│   ├── curso.service.ts
│   ├── inscricao.service.ts
│   ├── lista-espera.service.ts
│   └── auth.service.ts
├── repositories/    # Acesso ao Firestore (único lugar que conhece as coleções)
│   ├── turma.repository.ts
│   ├── inscricao.repository.ts
│   ├── aluno.repository.ts
│   ├── curso.repository.ts
│   └── usuario-equipe.repository.ts
├── models/          # Curso, Turma, Aluno, Inscricao, UsuarioEquipe
└── guards/          # equipeGuard (protege o painel)
```

As telas usam só os services. Os services aplicam as regras (vaga ou lista de espera, validação, promoção) e chamam os repositories. Só os repositories falam com o Firestore.

### Modelo de dados (Firestore)

| Coleção | Conteúdo | Quem acessa |
| --- | --- | --- |
| `cursos` | nome, descrição, público-alvo, carga horária, ativo | leitura pública; escrita da equipe |
| `turmas` | curso, horário, início, `vagasTotais`, `vagasOcupadas`, status | leitura pública; o aluno só pode ocupar uma vaga no mesmo lote da própria inscrição confirmada |
| `alunos/{uid}` | dados pessoais e consentimento LGPD | o próprio aluno e a equipe |
| `inscricoes/{turmaId}_{uid}` | status (`confirmada`, `lista_espera`, `cancelada`) e data | o aluno cria e lê a própria; a equipe gerencia |
| `usuariosEquipe/{uid}` | nome, e-mail, papel | gerenciada fora do app (console ou Admin SDK) |

## Como rodar

Pré-requisitos: **Node.js 22** (ou 20.19+) e **Java 21+**, que os emuladores do Firebase precisam. Não é preciso ter um projeto Firebase: localmente o app usa o projeto de demonstração `demo-reviver-conecta` nos emuladores.

```bash
# 1. Instale as dependências (versões travadas pelo package-lock.json)
npm ci

# 2. Configuração local: src/environments/environment.ts fica fora do git.
#    npm start/build/test cria o arquivo a partir do exemplo se ele não existir.
#    Para fazer isso à mão:
cp src/environments/environment.example.ts src/environments/environment.ts

# 3. Em um terminal, suba os emuladores (Auth :9099, Firestore :8080, UI :4000)
npm run emulators            # = npx firebase-tools@15 emulators:start

# 4. Em outro terminal, popule dados de exemplo e o usuário da equipe
npm run seed                 # login da equipe: equipe@reviver.test / reviver123

# 5. Rode o app em http://localhost:4200
npm start                    # = ng serve

# 6. Testes unitários (Vitest)
npm test                     # = ng test  (use `npm test -- --watch=false` no CI)

# Build de produção
npm run build                # = ng build
```

> O service worker do PWA só é ativado no build de produção (`ng build`). Para testar a instalação, sirva a pasta `dist/reviver-conecta/browser`.

### Usando um projeto Firebase real

1. Crie um projeto no Firebase com o Firestore e ative em Auth os provedores **Anônimo** e **E-mail/senha**.
2. Coloque as credenciais web **só** no `src/environments/environment.ts` local, que está no `.gitignore`, e use `useEmulators: false`.
3. Publique regras e índices com `npx firebase-tools@15 deploy --only firestore --project <seu-projeto>`.
4. Cadastre a equipe criando o usuário no Auth e um documento `usuariosEquipe/{uid}` com `nome`, `email` e `papel`.

Nunca faça commit de chaves ou credenciais.

## Fluxo de contribuição

- A `main` é protegida: toda mudança entra por **Pull Request**, com o check `build-and-test` passando e histórico linear.
- Use uma branch por mudança (`feat/...`, `fix/...`, `docs/...`, `ci/...`, `chore/...`).
- Commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `ci:`, `chore:`, `test:`).

## Próximos passos

- Testes das regras com `@firebase/rules-unit-testing` rodando no CI.
- Cloud Function para cancelar e promover numa única operação no servidor, e para avisar o aluno (WhatsApp/SMS) quando ele sair da lista de espera.
- Cadastro de cursos e turmas pelo painel.
