export type StatusTurma = 'aberta' | 'encerrada';

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  /** Human-readable schedule, e.g. "Seg e Qua, 19h às 21h". */
  horario: string;
  /** ISO date (YYYY-MM-DD). */
  dataInicio: string;
  vagasTotais: number;
  vagasOcupadas: number;
  status: StatusTurma;
}

export function vagasDisponiveis(turma: Turma): number {
  return Math.max(turma.vagasTotais - turma.vagasOcupadas, 0);
}

export function turmaLotada(turma: Turma): boolean {
  return vagasDisponiveis(turma) === 0;
}
