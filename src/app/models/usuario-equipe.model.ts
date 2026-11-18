export type PapelEquipe = 'admin' | 'coordenacao';

export interface UsuarioEquipe {
  /** Firebase Auth uid. */
  uid: string;
  nome: string;
  email: string;
  papel: PapelEquipe;
}
