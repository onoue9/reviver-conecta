import { TestBed } from '@angular/core/testing';

import { Curso, Turma } from '../models';
import { CursoRepository } from '../repositories/curso.repository';
import { TurmaRepository } from '../repositories/turma.repository';
import { CursoService } from './curso.service';

const curso = (id: string): Curso => ({
  id,
  nome: id,
  descricao: '',
  publicoAlvo: '',
  cargaHorariaHoras: 10,
  ativo: true,
});

const turma = (id: string, cursoId: string, dataInicio: string): Turma => ({
  id,
  cursoId,
  nome: id,
  horario: '',
  dataInicio,
  vagasTotais: 10,
  vagasOcupadas: 0,
  status: 'aberta',
});

describe('CursoService', () => {
  it('groups open turmas under their curso, ordered by start date', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CursoRepository,
          useValue: { listarAtivos: async () => [curso('a'), curso('b')] },
        },
        {
          provide: TurmaRepository,
          useValue: {
            listarAbertas: async () => [
              turma('a2', 'a', '2027-03-01'),
              turma('b1', 'b', '2027-02-01'),
              turma('a1', 'a', '2027-02-01'),
              turma('orfa', 'inativo', '2027-01-01'),
            ],
          },
        },
      ],
    });

    const resultado = await TestBed.inject(CursoService).listarCursosComTurmas();

    expect(resultado.map((c) => [c.id, c.turmas.map((t) => t.id)])).toEqual([
      ['a', ['a1', 'a2']],
      ['b', ['b1']],
    ]);
  });
});
