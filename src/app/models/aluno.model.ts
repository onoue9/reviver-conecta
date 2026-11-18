export interface Aluno {
  /** Same as the Firebase Auth uid of the (anonymous) session that registered. */
  id: string;
  nome: string;
  /** ISO date (YYYY-MM-DD). */
  dataNascimento: string;
  telefone: string;
  email?: string;
  bairro: string;
  /** LGPD consent for storing personal data. Must be true. */
  consentimentoLgpd: true;
}

export type DadosAluno = Omit<Aluno, 'id'>;
