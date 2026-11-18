export class TurmaNaoEncontradaError extends Error {
  constructor(turmaId: string) {
    super(`Turma ${turmaId} não encontrada.`);
    this.name = 'TurmaNaoEncontradaError';
  }
}

export class TurmaEncerradaError extends Error {
  constructor(turmaId: string) {
    super(`A turma ${turmaId} não está aceitando inscrições.`);
    this.name = 'TurmaEncerradaError';
  }
}

export class InscricaoDuplicadaError extends Error {
  constructor() {
    super('Você já possui uma inscrição nesta turma.');
    this.name = 'InscricaoDuplicadaError';
  }
}
