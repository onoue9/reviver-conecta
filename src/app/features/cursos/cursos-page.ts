import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { vagasDisponiveis } from '../../models';
import { CursoComTurmas, CursoService } from '../../services/curso.service';

@Component({
  selector: 'app-cursos-page',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Cursos com inscrições abertas</h1>

    @if (carregando()) {
      <mat-spinner diameter="40" aria-label="Carregando cursos" />
    } @else if (erro()) {
      <p class="erro" role="alert">{{ erro() }}</p>
    } @else {
      @for (curso of cursos(); track curso.id) {
        <mat-card class="curso" appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ curso.nome }}</mat-card-title>
            <mat-card-subtitle
              >{{ curso.publicoAlvo }} · {{ curso.cargaHorariaHoras }}h</mat-card-subtitle
            >
          </mat-card-header>
          <mat-card-content>
            <p>{{ curso.descricao }}</p>
            @for (turma of curso.turmas; track turma.id) {
              <div class="turma">
                <div>
                  <strong>{{ turma.nome }}</strong> — {{ turma.horario }}<br />
                  Início em {{ turma.dataInicio | date: 'dd/MM/yyyy' }}
                </div>
                @if (vagas(turma) > 0) {
                  <mat-chip-set
                    ><mat-chip>{{ vagas(turma) }} vaga(s)</mat-chip></mat-chip-set
                  >
                } @else {
                  <mat-chip-set><mat-chip>Lista de espera</mat-chip></mat-chip-set>
                }
                <a mat-flat-button [routerLink]="['/inscricao', turma.id]">
                  {{ vagas(turma) > 0 ? 'Inscrever-se' : 'Entrar na lista de espera' }}
                </a>
              </div>
            } @empty {
              <p>Nenhuma turma aberta no momento.</p>
            }
          </mat-card-content>
        </mat-card>
      } @empty {
        <p>Nenhum curso disponível no momento.</p>
      }
    }
  `,
  styles: `
    .curso {
      margin-bottom: 16px;
    }
    .turma {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .erro {
      color: var(--mat-sys-error);
    }
  `,
})
export class CursosPage implements OnInit {
  private readonly cursoService = inject(CursoService);

  protected readonly cursos = signal<CursoComTurmas[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly vagas = vagasDisponiveis;

  async ngOnInit(): Promise<void> {
    try {
      this.cursos.set(await this.cursoService.listarCursosComTurmas());
    } catch (error) {
      console.error(error);
      this.erro.set('Não foi possível carregar os cursos. Tente novamente mais tarde.');
    } finally {
      this.carregando.set(false);
    }
  }
}
