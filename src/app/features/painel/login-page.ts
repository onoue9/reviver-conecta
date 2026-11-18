import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Acesso da equipe</h1>
    <form [formGroup]="form" (ngSubmit)="entrar()" class="form">
      <mat-form-field>
        <mat-label>E-mail</mat-label>
        <input matInput type="email" formControlName="email" autocomplete="username" required />
        @if (form.controls.email.hasError('required')) {
          <mat-error>Informe o e-mail da equipe.</mat-error>
        } @else if (form.controls.email.hasError('email')) {
          <mat-error>Informe um e-mail válido, ex.: nome&#64;exemplo.com.</mat-error>
        }
      </mat-form-field>
      <mat-form-field>
        <mat-label>Senha</mat-label>
        <input
          matInput
          type="password"
          formControlName="senha"
          autocomplete="current-password"
          required
        />
        @if (form.controls.senha.hasError('required')) {
          <mat-error>Informe a senha.</mat-error>
        }
      </mat-form-field>
      @if (erro()) {
        <p class="erro" role="alert">{{ erro() }}</p>
      }
      <button mat-flat-button type="submit" [disabled]="form.invalid || entrando()">Entrar</button>
    </form>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 360px;
    }
    .erro {
      color: var(--mat-sys-error);
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly entrando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected async entrar(): Promise<void> {
    if (this.form.invalid) return;
    this.entrando.set(true);
    this.erro.set(null);
    try {
      const { email, senha } = this.form.getRawValue();
      await this.auth.entrarEquipe(email, senha);
      await this.router.navigate(['/painel']);
    } catch (error) {
      console.error(error);
      this.erro.set('E-mail ou senha inválidos, ou usuário sem acesso ao painel.');
    } finally {
      this.entrando.set(false);
    }
  }
}
