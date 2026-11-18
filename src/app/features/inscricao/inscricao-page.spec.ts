import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Turma } from '../../models';
import {
  InscricaoDuplicadaError,
  TurmaEncerradaError,
  TurmaNaoEncontradaError,
} from '../../repositories/errors';
import { CursoService } from '../../services/curso.service';
import { DadosInvalidosError, InscricaoService } from '../../services/inscricao.service';
import { InscricaoPage } from './inscricao-page';

const turmaAberta = (override: Partial<Turma> = {}): Turma => ({
  id: 't1',
  cursoId: 'c1',
  nome: 'Informática — Noite',
  horario: 'Seg e Qua, 19h às 21h',
  dataInicio: '2027-02-01',
  vagasTotais: 20,
  vagasOcupadas: 5,
  status: 'aberta',
  ...override,
});

function preencherFormulario(fixture: ComponentFixture<InscricaoPage>) {
  const component = fixture.componentInstance as unknown as {
    form: {
      patchValue: (v: Record<string, unknown>) => void;
      markAllAsTouched: () => void;
    };
  };
  component.form.patchValue({
    nome: 'Maria da Silva',
    dataNascimento: '2005-03-10',
    telefone: '(11) 91234-5678',
    email: 'maria@exemplo.com',
    bairro: 'Capão Redondo',
    consentimentoLgpd: true,
  });
  fixture.detectChanges();
}

describe('InscricaoPage', () => {
  const cursoService = { buscarTurma: vi.fn() };
  const inscricaoService = { inscrever: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    cursoService.buscarTurma.mockResolvedValue(turmaAberta());
    inscricaoService.inscrever.mockResolvedValue('confirmada');
  });

  async function render(turmaId = 't1') {
    TestBed.configureTestingModule({
      imports: [InscricaoPage],
      providers: [
        provideRouter([]),
        { provide: CursoService, useValue: cursoService },
        { provide: InscricaoService, useValue: inscricaoService },
      ],
    });
    const fixture = TestBed.createComponent(InscricaoPage);
    fixture.componentRef.setInput('turmaId', turmaId);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows turma details with available seats and waiting-list state', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Inscrição: Informática — Noite');
    expect(el.textContent).toContain('15 vaga(s) disponível(is)');

    TestBed.resetTestingModule();
    cursoService.buscarTurma.mockResolvedValue(turmaAberta({ vagasTotais: 2, vagasOcupadas: 2 }));
    const lotada = await render();
    expect((lotada.nativeElement as HTMLElement).textContent).toContain(
      'turma lotada (lista de espera)',
    );
  });

  it('shows an error when turma is closed, missing, or fails to load', async () => {
    cursoService.buscarTurma.mockResolvedValue(turmaAberta({ status: 'encerrada' }));
    const encerrada = await render();
    expect(
      (encerrada.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('não está aceitando inscrições');

    TestBed.resetTestingModule();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cursoService.buscarTurma.mockRejectedValue(new Error('network'));
    const falha = await render();
    expect(
      (falha.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('Não foi possível carregar a turma.');
  });

  it('displays text mat-error messages for invalid fields and LGPD consent', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const comp = fixture.componentInstance as unknown as {
      form: {
        controls: Record<string, { setValue: (v: unknown) => void; markAsTouched: () => void }>;
        markAllAsTouched: () => void;
      };
    };

    comp.form.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errosVazio = Array.from(el.querySelectorAll('mat-error')).map((e) =>
      e.textContent?.trim(),
    );
    expect(errosVazio).toContain('Informe o seu nome completo.');
    expect(errosVazio).toContain('Informe a data de nascimento.');
    expect(errosVazio).toContain('Informe o telefone com DDD, ex.: (11) 91234-5678.');
    expect(errosVazio).toContain('Informe o bairro onde você mora.');
    expect(el.textContent).toContain('Marque esta caixa para autorizar o uso dos dados');

    comp.form.controls['nome'].setValue('Ab');
    comp.form.controls['telefone'].setValue('91234-567');
    comp.form.controls['email'].setValue('invalido');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errosFormato = Array.from(el.querySelectorAll('mat-error')).map((e) =>
      e.textContent?.trim(),
    );
    expect(errosFormato).toContain('Informe pelo menos 3 letras no nome.');
    expect(errosFormato).toContain('Informe o telefone com DDD, ex.: (11) 91234-5678.');
    expect(errosFormato).toContain('Informe um e-mail válido, ex.: nome@exemplo.com.');
  });

  it('submits valid data and displays confirmed or waiting-list status', async () => {
    const fixture = await render();
    preencherFormulario(fixture);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inscricaoService.inscrever).toHaveBeenCalledWith('t1', {
      nome: 'Maria da Silva',
      dataNascimento: '2005-03-10',
      telefone: '(11) 91234-5678',
      email: 'maria@exemplo.com',
      bairro: 'Capão Redondo',
      consentimentoLgpd: true,
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inscrição confirmada!');

    TestBed.resetTestingModule();
    inscricaoService.inscrever.mockResolvedValue('lista_espera');
    const esperaFixture = await render();
    preencherFormulario(esperaFixture);
    (esperaFixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await esperaFixture.whenStable();
    esperaFixture.detectChanges();

    expect((esperaFixture.nativeElement as HTMLElement).textContent).toContain(
      'Você está na lista de espera',
    );
  });

  it.each([
    ['DadosInvalidosError', new DadosInvalidosError('Informe um telefone com DDD.')],
    ['InscricaoDuplicadaError', new InscricaoDuplicadaError()],
    ['TurmaEncerradaError', new TurmaEncerradaError('t1')],
    ['TurmaNaoEncontradaError', new TurmaNaoEncontradaError('t1')],
  ])('shows domain error message for %s', async (_nome, domainError) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    inscricaoService.inscrever.mockRejectedValue(domainError);

    const fixture = await render();
    preencherFormulario(fixture);
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe(domainError.message);
  });

  it('hides internal Firebase error details behind a generic message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    inscricaoService.inscrever.mockRejectedValue(
      new Error('FirebaseError: Missing or insufficient permissions.'),
    );

    const fixture = await render();
    preencherFormulario(fixture);
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível concluir a inscrição');
    expect(alert?.textContent).not.toContain('FirebaseError');
    expect(alert?.textContent).not.toContain('insufficient permissions');
  });
});
