import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';

import { Turma, vagasDisponiveis } from '../../models';
import {
  InscricaoDuplicadaError,
  TurmaEncerradaError,
  TurmaNaoEncontradaError,
} from '../../repositories/errors';
import { CursoService } from '../../services/curso.service';
import {
  DadosInvalidosError,
  InscricaoService,
  ResultadoInscricao,
} from '../../services/inscricao.service';

@Component({
  selector: 'app-inscricao-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a mat-button routerLink="/cursos">← Voltar aos cursos</a>

    @if (resultado(); as status) {
      <mat-card appearance="outlined" role="status">
        <mat-card-content>
          @if (status === 'confirmada') {
            <h2>Inscrição confirmada!</h2>
            <p>
              Sua vaga está garantida. A equipe da Reviver entrará em contato pelo telefone
              informado.
            </p>
          } @else {
            <h2>Você está na lista de espera</h2>
            <p>A turma está lotada. Avisaremos pelo telefone assim que uma vaga for liberada.</p>
          }
        </mat-card-content>
      </mat-card>
    } @else if (turma(); as t) {
      <h1>Inscrição: {{ t.nome }}</h1>
      <p>
        {{ t.horario }} · início em {{ t.dataInicio | date: 'dd/MM/yyyy' }} ·
        @if (vagas(t) > 0) {
          {{ vagas(t) }} vaga(s) disponível(is)
        } @else {
          turma lotada (lista de espera)
        }
      </p>

      <form [formGroup]="form" (ngSubmit)="enviar()" class="form">
        <mat-form-field>
          <mat-label>Nome completo</mat-label>
          <input matInput formControlName="nome" autocomplete="name" required />
          @if (form.controls.nome.hasError('required')) {
            <mat-error>Informe seu nome completo.</mat-error>
          } @else if (form.controls.nome.hasError('minlength')) {
            <mat-error>O nome precisa ter pelo menos 3 letras.</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Data de nascimento</mat-label>
          <input matInput type="date" formControlName="dataNascimento" required />
          @if (form.controls.dataNascimento.hasError('required')) {
            <mat-error>Informe sua data de nascimento.</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Telefone (com DDD)</mat-label>
          <input matInput type="tel" formControlName="telefone" autocomplete="tel" required />
          @if (form.controls.telefone.hasError('required')) {
            <mat-error>Informe um telefone para contato.</mat-error>
          } @else if (form.controls.telefone.hasError('pattern')) {
            <mat-error>Informe o telefone com DDD, ex.: (11) 91234-5678.</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>E-mail (opcional)</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.hasError('email')) {
            <mat-error>Informe um e-mail válido, ex.: nome&#64;email.com.</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Bairro</mat-label>
          <input matInput formControlName="bairro" required />
          @if (form.controls.bairro.hasError('required')) {
            <mat-error>Informe o bairro onde você mora.</mat-error>
          }
        </mat-form-field>
        <mat-checkbox formControlName="consentimentoLgpd" aria-describedby="aviso-consentimento">
          Autorizo a ONG Reviver Capão a usar meus dados apenas para esta inscrição (LGPD).
        </mat-checkbox>

        @if (tentouEnviar() && !form.controls.consentimentoLgpd.value) {
          <p id="aviso-consentimento" class="erro" role="alert">
            Marque a autorização de uso dos dados para continuar.
          </p>
        }

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Enviando…' : 'Confirmar inscrição' }}
        </button>
      </form>
    } @else if (erro()) {
      <p class="erro" role="alert">{{ erro() }}</p>
    }
  `,
  styles: `
    h1 {
      line-height: 1.25;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 480px;
    }
    .erro {
      color: var(--mat-sys-error);
    }
  `,
})
export class InscricaoPage implements OnInit {
  /** Bound from the `:turmaId` route param. */
  readonly turmaId = input.required<string>();

  private readonly cursoService = inject(CursoService);
  private readonly inscricaoService = inject(InscricaoService);

  protected readonly turma = signal<Turma | null>(null);
  protected readonly resultado = signal<ResultadoInscricao | null>(null);
  protected readonly enviando = signal(false);
  protected readonly tentouEnviar = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly vagas = vagasDisponiveis;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    dataNascimento: ['', Validators.required],
    telefone: ['', [Validators.required, Validators.pattern(/^[\d\s()+-]{10,}$/)]],
    email: ['', Validators.email],
    bairro: ['', Validators.required],
    consentimentoLgpd: [false, Validators.requiredTrue],
  });

  async ngOnInit(): Promise<void> {
    try {
      const turma = await this.cursoService.buscarTurma(this.turmaId());
      if (!turma || turma.status !== 'aberta') {
        this.erro.set('Esta turma não está aceitando inscrições.');
      }
      this.turma.set(turma?.status === 'aberta' ? turma : null);
    } catch (error) {
      console.error(error);
      this.erro.set('Não foi possível carregar a turma.');
    }
  }

  protected async enviar(): Promise<void> {
    this.tentouEnviar.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    try {
      const { consentimentoLgpd, ...dados } = this.form.getRawValue();
      if (!consentimentoLgpd) return;
      this.resultado.set(
        await this.inscricaoService.inscrever(this.turmaId(), { ...dados, consentimentoLgpd }),
      );
    } catch (error) {
      console.error(error);
      this.erro.set(mensagemDeErro(error));
    } finally {
      this.enviando.set(false);
    }
  }
}

function mensagemDeErro(error: unknown): string {
  if (
    error instanceof DadosInvalidosError ||
    error instanceof InscricaoDuplicadaError ||
    error instanceof TurmaEncerradaError ||
    error instanceof TurmaNaoEncontradaError
  ) {
    return error.message;
  }
  return 'Não foi possível concluir a inscrição. Tente novamente.';
}
