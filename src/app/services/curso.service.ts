import { Injectable, inject } from '@angular/core';

import { Curso, Turma } from '../models';
import { CursoRepository } from '../repositories/curso.repository';
import { TurmaRepository } from '../repositories/turma.repository';

export interface CursoComTurmas extends Curso {
  turmas: Turma[];
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private readonly cursos = inject(CursoRepository);
  private readonly turmas = inject(TurmaRepository);

  /** Active courses with their open turmas, ordered by start date. */
  async listarCursosComTurmas(): Promise<CursoComTurmas[]> {
    const [cursos, turmas] = await Promise.all([
      this.cursos.listarAtivos(),
      this.turmas.listarAbertas(),
    ]);
    return cursos.map((curso) => ({
      ...curso,
      turmas: turmas
        .filter((t) => t.cursoId === curso.id)
        .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
    }));
  }

  buscarTurma(turmaId: string): Promise<Turma | null> {
    return this.turmas.buscar(turmaId);
  }

  listarTodasTurmas(): Promise<Turma[]> {
    return this.turmas.listarTodas();
  }
}
