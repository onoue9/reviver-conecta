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

function preencherFormulario(
  fixture: ComponentFixture<InscricaoPage>,
  override: Partial<Record<string, unknown>> = {},
) {
  const component = fixture.componentInstance as unknown as {
    form: {
      patchValue: (v: Record<string, unknown>) => void;
    };
  };
  component.form.patchValue({
    nome: 'Maria da Silva',
    dataNascimento: '2005-03-10',
    telefone: '(11) 91234-5678',
    email: 'maria@email.com',
    bairro: 'Capão Redondo',
    consentimentoLgpd: true,
    ...override,
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

  it('exibe erro de telefone sem DDD em texto após tentar enviar', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    preencherFormulario(fixture, { telefone: '91234-567' });
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const erros = Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(erros).toContain('Informe o telefone com DDD, ex.: (11) 91234-5678.');
    expect(inscricaoService.inscrever).not.toHaveBeenCalled();
  });

  it('mostra aviso de consentimento acima do botão e não desabilita o botão', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const botao = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(botao.disabled).toBe(false);
    expect(el.querySelector('#aviso-consentimento')).toBeNull();

    preencherFormulario(fixture, { consentimentoLgpd: false });
    botao.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const aviso = el.querySelector('#aviso-consentimento');
    const checkbox = el.querySelector('mat-checkbox');
    const checkboxInput = checkbox?.querySelector('input[type="checkbox"]');
    expect(botao.disabled).toBe(false);
    expect(aviso?.getAttribute('role')).toBe('alert');
    expect(aviso?.textContent?.trim()).toBe(
      'Marque a autorização de uso dos dados para continuar.',
    );
    expect(checkbox?.getAttribute('aria-describedby')).toBe('aviso-consentimento');
    expect(checkboxInput?.getAttribute('aria-describedby')).toBe('aviso-consentimento');
    expect(Boolean(aviso!.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );
    expect(inscricaoService.inscrever).not.toHaveBeenCalled();
  });

  it('envio válido mostra "Inscrição confirmada!"', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    preencherFormulario(fixture);

    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inscricaoService.inscrever).toHaveBeenCalledWith('t1', {
      nome: 'Maria da Silva',
      dataNascimento: '2005-03-10',
      telefone: '(11) 91234-5678',
      email: 'maria@email.com',
      bairro: 'Capão Redondo',
      consentimentoLgpd: true,
    });
    expect(el.textContent).toContain('Inscrição confirmada!');
  });

  it('mostra a mensagem original para erros de domínio', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    preencherFormulario(fixture);

    const errosDominio = [
      new DadosInvalidosError('Informe um telefone com DDD.'),
      new InscricaoDuplicadaError(),
      new TurmaEncerradaError('t1'),
      new TurmaNaoEncontradaError('t1'),
    ];

    for (const erroDominio of errosDominio) {
      inscricaoService.inscrever.mockRejectedValueOnce(erroDominio);
      el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      const alert = el.querySelector('[role="alert"]');
      expect(alert?.textContent?.trim()).toBe(erroDominio.message);
    }
  });

  it('mostra apenas mensagem genérica para erro técnico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    inscricaoService.inscrever.mockRejectedValue(
      new Error('FirebaseError: Missing or insufficient permissions.'),
    );

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    preencherFormulario(fixture);

    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBe(
      'Não foi possível concluir a inscrição. Tente novamente.',
    );
    expect(alert?.textContent).not.toContain('FirebaseError');
    expect(alert?.textContent).not.toContain('insufficient permissions');
  });
});
