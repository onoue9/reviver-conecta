import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const auth = { entrarEquipe: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows mat-error messages for missing or invalid email and password', async () => {
    const fixture = await render();
    const comp = fixture.componentInstance as unknown as {
      form: {
        controls: Record<string, { setValue: (v: string) => void }>;
        markAllAsTouched: () => void;
      };
    };

    comp.form.markAllAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const erros = Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(erros).toContain('Informe o e-mail da equipe.');
    expect(erros).toContain('Informe a senha.');

    comp.form.controls['email'].setValue('invalido');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim()),
    ).toContain('Informe um e-mail válido, ex.: nome@exemplo.com.');
  });

  it('authenticates and navigates to /painel on valid submit', async () => {
    auth.entrarEquipe.mockResolvedValue(undefined);
    const fixture = await render();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const comp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: Record<string, string>) => void };
    };
    comp.form.patchValue({ email: 'equipe@reviver.test', senha: '123' });
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(auth.entrarEquipe).toHaveBeenCalledWith('equipe@reviver.test', '123');
    expect(navigateSpy).toHaveBeenCalledWith(['/painel']);
  });

  it('shows an error alert when sign-in fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    auth.entrarEquipe.mockRejectedValue(new Error('auth/invalid-credential'));
    const fixture = await render();

    const comp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: Record<string, string>) => void };
    };
    comp.form.patchValue({ email: 'equipe@reviver.test', senha: 'errada' });
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('E-mail ou senha inválidos');
  });
});
