import { Injectable, inject } from '@angular/core';

import { Inscricao } from '../models';
import { InscricaoRepository } from '../repositories/inscricao.repository';

@Injectable({ providedIn: 'root' })
export class ListaEsperaService {
  private readonly inscricoes = inject(InscricaoRepository);

  /** Waiting list for the turma in arrival order. */
  listar(turmaId: string): Promise<Inscricao[]> {
    return this.inscricoes.listarListaEspera(turmaId);
  }

  /** 1-based position of the inscrição in the list, or null if it is not waiting. */
  posicao(lista: readonly Inscricao[], inscricaoId: string): number | null {
    const index = lista.findIndex((i) => i.id === inscricaoId);
    return index === -1 ? null : index + 1;
  }

  /**
   * Confirms the oldest waiting inscrição for the turma, if a seat is free.
   * Tries the next one when a concurrent change makes a promotion fail.
   * Returns the promoted inscrição or null.
   */
  async promoverProximo(turmaId: string): Promise<Inscricao | null> {
    const lista = await this.listar(turmaId);
    for (const candidata of lista) {
      if (await this.inscricoes.promover(candidata.id)) {
        return { ...candidata, status: 'confirmada' };
      }
    }
    return null;
  }
}
