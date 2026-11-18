// Seeds the local Firebase emulators with sample data and a team user.
// Usage: start the emulators (`npm run emulators`), then `npm run seed`.
//
// Talks to the emulator REST APIs directly; `Bearer owner` bypasses security
// rules and only works against the Firestore emulator, never production.

const PROJECT_ID = 'demo-reviver-conecta';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099';

const EQUIPE = { email: 'equipe@reviver.test', senha: 'reviver123', nome: 'Coordenação Reviver' };

const cursos = {
  informatica: {
    nome: 'Informática Básica',
    descricao: 'Uso do computador, internet, e-mail e ferramentas de escritório.',
    publicoAlvo: 'Jovens e adultos a partir de 14 anos',
    cargaHorariaHoras: 40,
    ativo: true,
  },
  'jovem-aprendiz': {
    nome: 'Preparação Jovem Aprendiz',
    descricao: 'Currículo, entrevista de emprego e comportamento no trabalho.',
    publicoAlvo: 'Jovens de 15 a 24 anos',
    cargaHorariaHoras: 24,
    ativo: true,
  },
};

const turmas = {
  'informatica-noite': {
    cursoId: 'informatica',
    nome: 'Informática — Noite',
    horario: 'Seg e Qua, 19h às 21h',
    dataInicio: '2027-02-01',
    vagasTotais: 20,
    vagasOcupadas: 0,
    status: 'aberta',
  },
  'informatica-sabado': {
    cursoId: 'informatica',
    nome: 'Informática — Sábado',
    horario: 'Sáb, 9h às 12h',
    dataInicio: '2027-02-06',
    vagasTotais: 2,
    vagasOcupadas: 0,
    status: 'aberta',
  },
  'jovem-aprendiz-tarde': {
    cursoId: 'jovem-aprendiz',
    nome: 'Jovem Aprendiz — Tarde',
    horario: 'Ter e Qui, 14h às 16h',
    dataInicio: '2027-02-02',
    vagasTotais: 15,
    vagasOcupadas: 0,
    status: 'aberta',
  },
};

function toValue(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  throw new Error(`Unsupported value: ${v}`);
}

async function upsert(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
  const res = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`);
}

async function criarUsuarioEquipe() {
  const signUp = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EQUIPE.email,
        password: EQUIPE.senha,
        returnSecureToken: true,
      }),
    },
  );
  let body = await signUp.json();
  if (!signUp.ok && body.error?.message === 'EMAIL_EXISTS') {
    const signIn = await fetch(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: EQUIPE.email,
          password: EQUIPE.senha,
          returnSecureToken: true,
        }),
      },
    );
    body = await signIn.json();
    if (!signIn.ok) throw new Error(`signIn: ${JSON.stringify(body)}`);
  } else if (!signUp.ok) {
    throw new Error(`signUp: ${JSON.stringify(body)}`);
  }
  await upsert(`usuariosEquipe/${body.localId}`, {
    nome: EQUIPE.nome,
    email: EQUIPE.email,
    papel: 'coordenacao',
  });
}

try {
  for (const [id, data] of Object.entries(cursos)) await upsert(`cursos/${id}`, data);
  for (const [id, data] of Object.entries(turmas)) await upsert(`turmas/${id}`, data);
  await criarUsuarioEquipe();
  console.log(`Seed concluído. Login da equipe: ${EQUIPE.email} / ${EQUIPE.senha}`);
} catch (error) {
  console.error('Falha no seed. Os emuladores estão rodando (npm run emulators)?');
  console.error(error);
  process.exit(1);
}
