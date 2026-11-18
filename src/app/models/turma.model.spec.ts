import { Turma, inscricaoId, turmaLotada, vagasDisponiveis } from '.';

const turma = (vagasOcupadas: number, vagasTotais = 10): Turma => ({
  id: 't1',
  cursoId: 'c1',
  nome: 'Turma',
  horario: 'Seg 19h',
  dataInicio: '2027-02-01',
  vagasTotais,
  vagasOcupadas,
  status: 'aberta',
});

describe('turma model', () => {
  it('computes available seats', () => {
    expect(vagasDisponiveis(turma(3))).toBe(7);
    expect(turmaLotada(turma(3))).toBe(false);
  });

  it('treats full and over-booked turmas as full without negative seats', () => {
    expect(vagasDisponiveis(turma(10))).toBe(0);
    expect(vagasDisponiveis(turma(12))).toBe(0);
    expect(turmaLotada(turma(10))).toBe(true);
  });

  it('builds a deterministic inscrição id', () => {
    expect(inscricaoId('turma1', 'uid1')).toBe('turma1_uid1');
  });
});
