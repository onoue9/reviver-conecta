import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';

import { Inscricao, Turma, UsuarioEquipe } from '../../models';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { InscricaoService } from '../../services/inscricao.service';
import { PainelPage } from './painel-page';

const turmas: Turma[] = [
  {
    id: 't1',
    cursoId: 'c1',
    nome: 'Informática — Sábado',
    horario: 'Sáb, 9h às 12h',
    dataInicio: '2027-02-06',
    vagasTotais: 2,
    vagasOcupadas: 2,
    status: 'aberta',
  },
  {
    id: 't2',
    cursoId: 'c1',
    nome: 'Informática — Noite',
    horario: 'Seg, 19h',
    dataInicio: '2027-02-01',
    vagasTotais: 20,
    vagasOcupadas: 1,
    status: 'aberta',
  },
];

const inscricoesT1: Inscricao[] = [
  {
    id: 't1_a1',
    turmaId: 't1',
    cursoId: 'c1',
    alunoId: 'a1',
    nomeAluno: 'Bianca Rocha',
    status: 'confirmada',
    criadaEm: new Date('2026-11-10T13:05:00Z'),
  },
  {
    id: 't1_a2',
    turmaId: 't1',
    cursoId: 'c1',
    alunoId: 'a2',
    nomeAluno: 'Eduarda Campos',
    status: 'lista_espera',
    criadaEm: new Date('2026-11-11T09:12:00Z'),
  },
];

describe('PainelPage', () => {
  const equipe = signal<UsuarioEquipe | null>({
    uid: 'u1',
    nome: 'Coordenação Reviver',
    email: 'equipe@reviver.test',
    papel: 'coordenacao',
  });
  const auth = { equipe: equipe.asReadonly(), sair: vi.fn() };
  const cursoService = { listarTodasTurmas: vi.fn() };
  const inscricaoService = { listarPorTurma: vi.fn(), cancelar: vi.fn() };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    cursoService.listarTodasTurmas.mockResolvedValue(turmas);
    inscricaoService.listarPorTurma.mockResolvedValue(inscricoesT1);
    auth.sair.mockResolvedValue(undefined);
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  async function render() {
    TestBed.configureTestingModule({
      imports: [PainelPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CursoService, useValue: cursoService },
        { provide: InscricaoService, useValue: inscricaoService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const fixture = TestBed.createComponent(PainelPage);
    fixture.detectChanges();
    await flush();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('loads turmas, separates confirmed and waiting list, and sets descriptive aria-labels', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Coordenação Reviver');
    expect(el.textContent).toContain('2 de 2 vagas ocupadas');
    expect(el.textContent).toContain('1 na lista de espera');

    const cancelarBtn = el.querySelector('table button');
    const removerBtn = el.querySelector('ol button');
    expect(cancelarBtn?.getAttribute('aria-label')).toBe('Cancelar inscrição de Bianca Rocha');
    expect(removerBtn?.getAttribute('aria-label')).toBe(
      'Remover Eduarda Campos da lista de espera',
    );
  });

  it('cancels an enrollment, notifies about promotion, and reloads', async () => {
    inscricaoService.cancelar.mockResolvedValue(inscricoesT1[1]);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('table button') as HTMLButtonElement).click();
    await flush();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inscricaoService.cancelar).toHaveBeenCalledWith(inscricoesT1[0]);
    expect(snackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('Eduarda Campos saiu da lista de espera e foi confirmada'),
      'OK',
      { duration: 5000 },
    );
    expect(cursoService.listarTodasTurmas).toHaveBeenCalledTimes(2);
  });

  it('shows simple confirmation when removing without promotion and handles cancel errors', async () => {
    inscricaoService.cancelar.mockResolvedValue(null);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('ol button') as HTMLButtonElement).click();
    await flush();
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('Inscrição cancelada.', 'OK', { duration: 5000 });

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    inscricaoService.cancelar.mockRejectedValue(new Error('firestore error'));
    (el.querySelector('ol button') as HTMLButtonElement).click();
    await flush();
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('Não foi possível cancelar a inscrição.', 'OK', {
      duration: 5000,
    });
  });

  it('switches turma and signs out back to cursos', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    inscricaoService.listarPorTurma.mockResolvedValue([]);
    await (
      fixture.componentInstance as unknown as { selecionar: (id: string) => Promise<void> }
    ).selecionar('t2');
    fixture.detectChanges();

    expect(inscricaoService.listarPorTurma).toHaveBeenCalledWith('t2');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ninguém na lista de espera.',
    );

    const sairBtn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('header button'),
    ).find((b) => b.textContent?.includes('Sair')) as HTMLButtonElement;
    sairBtn.click();
    await flush();
    await fixture.whenStable();

    expect(auth.sair).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/cursos']);
  });

  it('shows a snackbar error when initial load fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cursoService.listarTodasTurmas.mockRejectedValue(new Error('offline'));

    await render();
    expect(snackBar.open).toHaveBeenCalledWith('Não foi possível carregar o painel.', 'OK', {
      duration: 5000,
    });
  });
});
