import { Injectable, inject } from '@angular/core';

import { DadosAluno, Inscricao, StatusInscricao, Turma, turmaLotada } from '../models';
import { InscricaoRepository } from '../repositories/inscricao.repository';
import { AuthService } from './auth.service';
import { ListaEsperaService } from './lista-espera.service';

export type ResultadoInscricao = Exclude<StatusInscricao, 'cancelada'>;

export class DadosInvalidosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DadosInvalidosError';
  }
}

@Injectable({ providedIn: 'root' })
export class InscricaoService {
  private readonly repo = inject(InscricaoRepository);
  private readonly auth = inject(AuthService);
  private readonly listaEspera = inject(ListaEsperaService);

  /** Core rule: confirm while there are seats, otherwise go to the waiting list. */
  decidirStatus(turma: Turma): ResultadoInscricao {
    return turmaLotada(turma) ? 'lista_espera' : 'confirmada';
  }

  async inscrever(turmaId: string, dados: DadosAluno): Promise<ResultadoInscricao> {
    this.validar(dados);
    const alunoId = await this.auth.garantirSessaoAluno();
    const status = await this.repo.registrar({
      turmaId,
      aluno: { id: alunoId, ...this.normalizar(dados) },
      decidirStatus: (turma) => this.decidirStatus(turma),
    });
    return status as ResultadoInscricao;
  }

  listarPorTurma(turmaId: string): Promise<Inscricao[]> {
    return this.repo.listarPorTurma(turmaId);
  }

  /**
   * Cancels the inscrição. When it held a seat, the next person on the waiting
   * list is promoted. Returns the promoted inscrição, if any.
   */
  async cancelar(inscricao: Inscricao): Promise<Inscricao | null> {
    const anterior = await this.repo.cancelar(inscricao.id);
    if (anterior !== 'confirmada') return null;
    return this.listaEspera.promoverProximo(inscricao.turmaId);
  }

  private validar(dados: DadosAluno): void {
    if (dados.nome.trim().length < 3) throw new DadosInvalidosError('Informe o nome completo.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataNascimento)) {
      throw new DadosInvalidosError('Data de nascimento inválida.');
    }
    if (dados.telefone.replace(/\D/g, '').length < 10) {
      throw new DadosInvalidosError('Informe um telefone com DDD.');
    }
    if (!dados.bairro.trim()) throw new DadosInvalidosError('Informe o bairro.');
    if (dados.consentimentoLgpd !== true) {
      throw new DadosInvalidosError('É preciso aceitar o uso dos dados para a inscrição.');
    }
  }

  private normalizar(dados: DadosAluno): DadosAluno {
    const email = dados.email?.trim();
    return {
      nome: dados.nome.trim(),
      dataNascimento: dados.dataNascimento,
      telefone: dados.telefone.replace(/\D/g, ''),
      bairro: dados.bairro.trim(),
      consentimentoLgpd: true,
      ...(email ? { email } : {}),
    };
  }
}
