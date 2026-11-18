export type StatusInscricao = 'confirmada' | 'lista_espera' | 'cancelada';

export interface Inscricao {
  /** Deterministic id `${turmaId}_${alunoId}`, which prevents duplicate sign-ups. */
  id: string;
  turmaId: string;
  cursoId: string;
  alunoId: string;
  nomeAluno: string;
  status: StatusInscricao;
  criadaEm: Date;
}

export function inscricaoId(turmaId: string, alunoId: string): string {
  return `${turmaId}_${alunoId}`;
}
