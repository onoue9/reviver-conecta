import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CursoComTurmas, CursoService } from '../../services/curso.service';
import { CursosPage } from './cursos-page';

const curso: CursoComTurmas = {
  id: 'info',
  nome: 'Informática Básica',
  descricao: 'Uso do computador',
  publicoAlvo: 'A partir de 14 anos',
  cargaHorariaHoras: 40,
  ativo: true,
  turmas: [
    {
      id: 'noite',
      cursoId: 'info',
      nome: 'Noite',
      horario: 'Seg 19h',
      dataInicio: '2027-02-01',
      vagasTotais: 20,
      vagasOcupadas: 5,
      status: 'aberta',
    },
    {
      id: 'sabado',
      cursoId: 'info',
      nome: 'Sábado',
      horario: 'Sáb 9h',
      dataInicio: '2027-02-06',
      vagasTotais: 2,
      vagasOcupadas: 2,
      status: 'aberta',
    },
  ],
};

async function render(listar: () => Promise<CursoComTurmas[]>) {
  TestBed.configureTestingModule({
    imports: [CursosPage],
    providers: [
      provideRouter([]),
      { provide: CursoService, useValue: { listarCursosComTurmas: listar } },
    ],
  });
  const fixture = TestBed.createComponent(CursosPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CursosPage', () => {
  it('lists courses with seats and waiting-list actions', async () => {
    const el = await render(async () => [curso]);

    expect(el.textContent).toContain('Informática Básica');
    expect(el.textContent).toContain('15 vaga(s)');
    const links = Array.from(el.querySelectorAll('a')).map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Inscrever-se', '/inscricao/noite'],
      ['Entrar na lista de espera', '/inscricao/sabado'],
    ]);
  });

  it('shows an error message when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const el = await render(async () => {
      throw new Error('offline');
    });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');
  });
});
