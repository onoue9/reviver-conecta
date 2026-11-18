import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Turma } from '../../models';
import { CursoService } from '../../services/curso.service';
import { InscricaoService } from '../../services/inscricao.service';
import { InscricaoPage } from './inscricao-page';

const turmaAberta: Turma = {
  id: 't1',
  cursoId: 'c1',
  nome: 'Informática — Noite',
  horario: 'Seg e Qua, 19h às 21h',
  dataInicio: '2027-02-01',
  vagasTotais: 20,
  vagasOcupadas: 5,
  status: 'aberta',
};

function preencherFormulario(fixture: ComponentFixture<InscricaoPage>) {
  const component = fixture.componentInstance as unknown as {
    form: {
      patchValue: (v: Record<string, unknown>) => void;
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
    cursoService.buscarTurma.mockResolvedValue(turmaAberta);
    inscricaoService.inscrever.mockResolvedValue('confirmada');
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [InscricaoPage],
      providers: [
        provideRouter([]),
        { provide: CursoService, useValue: cursoService },
        { provide: InscricaoService, useValue: inscricaoService },
      ],
    });
    const fixture = TestBed.createComponent(InscricaoPage);
    fixture.componentRef.setInput('turmaId', 't1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows mat-error text for each invalid form field', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const comp = fixture.componentInstance as unknown as {
      form: {
        controls: Record<string, { setValue: (v: unknown) => void }>;
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
    expect(errosVazio).toEqual([
      'Informe o seu nome completo',
      'Informe a data de nascimento',
      'Informe o telefone com DDD, ex.: (11) 91234-5678',
      'Informe o bairro onde você mora',
    ]);

    comp.form.controls['nome'].setValue('Ab');
    comp.form.controls['telefone'].setValue('91234-567');
    comp.form.controls['email'].setValue('email-invalido');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errosFormato = Array.from(el.querySelectorAll('mat-error')).map((e) =>
      e.textContent?.trim(),
    );
    expect(errosFormato).toContain('Informe pelo menos 3 letras no nome');
    expect(errosFormato).toContain('Informe o telefone com DDD, ex.: (11) 91234-5678');
    expect(errosFormato).toContain('Informe um e-mail válido, ex.: nome@exemplo.com');
  });

  it('shows consent reminder below submit button until LGPD consent is checked', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const comp = fixture.componentInstance as unknown as {
      form: {
        controls: Record<string, { setValue: (v: unknown) => void }>;
      };
    };

    const botao = el.querySelector('button[type="submit"]');
    const aviso = el.querySelector('.dica-consentimento');
    expect(aviso?.textContent?.trim()).toBe('Marque a autorização de uso dos dados para continuar');
    expect(botao?.nextElementSibling).toBe(aviso);

    comp.form.controls['consentimentoLgpd'].setValue(true);
    fixture.detectChanges();

    expect(el.querySelector('.dica-consentimento')).toBeNull();
  });

  it('submits valid data and displays confirmed status', async () => {
    const fixture = await render();
    preencherFormulario(fixture);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inscricaoService.inscrever).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inscrição confirmada!');
  });
});
