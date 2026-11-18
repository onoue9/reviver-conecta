export interface Curso {
  id: string;
  nome: string;
  descricao: string;
  /** Who the course is meant for, e.g. "Jovens de 15 a 24 anos". */
  publicoAlvo: string;
  cargaHorariaHoras: number;
  ativo: boolean;
}
