import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { Inscricao, Turma, vagasDisponiveis } from '../../models';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { InscricaoService } from '../../services/inscricao.service';

@Component({
  selector: 'app-painel-page',
  imports: [DatePipe, MatButtonModule, MatFormFieldModule, MatSelectModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topo">
      <h1>Painel da equipe</h1>
      <span>{{ auth.equipe()?.nome }}</span>
      <button mat-button (click)="sair()">Sair</button>
    </header>

    <mat-form-field>
      <mat-label>Turma</mat-label>
      <mat-select [value]="turmaSelecionada()?.id" (selectionChange)="selecionar($event.value)">
        @for (t of turmas(); track t.id) {
          <mat-option [value]="t.id"
            >{{ t.nome }} ({{ t.vagasOcupadas }}/{{ t.vagasTotais }})</mat-option
          >
        }
      </mat-select>
    </mat-form-field>

    @if (turmaSelecionada(); as t) {
      <p>
        <strong>{{ t.vagasOcupadas }}</strong> de {{ t.vagasTotais }} vagas ocupadas ·
        {{ vagas(t) }} livre(s) · {{ listaEspera().length }} na lista de espera
      </p>

      <h2>Inscritos</h2>
      <table mat-table [dataSource]="confirmadas()">
        <ng-container matColumnDef="nome">
          <th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let i">{{ i.nomeAluno }}</td>
        </ng-container>
        <ng-container matColumnDef="data">
          <th mat-header-cell *matHeaderCellDef>Inscrito em</th>
          <td mat-cell *matCellDef="let i">{{ i.criadaEm | date: 'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>
        <ng-container matColumnDef="acoes">
          <th mat-header-cell *matHeaderCellDef>Ações</th>
          <td mat-cell *matCellDef="let i">
            <button
              mat-button
              (click)="cancelar(i)"
              [attr.aria-label]="'Cancelar inscrição de ' + i.nomeAluno"
            >
              Cancelar
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
      </table>

      <h2>Lista de espera</h2>
      <ol>
        @for (i of listaEspera(); track i.id) {
          <li>
            {{ i.nomeAluno }} — {{ i.criadaEm | date: 'dd/MM/yyyy HH:mm' }}
            <button
              mat-button
              (click)="cancelar(i)"
              [attr.aria-label]="'Remover ' + i.nomeAluno + ' da lista de espera'"
            >
              Remover
            </button>
          </li>
        } @empty {
          <p>Ninguém na lista de espera.</p>
        }
      </ol>
    }
  `,
  styles: `
    .topo {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .topo h1 {
      flex: 1;
    }
    table {
      width: 100%;
    }
  `,
})
export class PainelPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly inscricaoService = inject(InscricaoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly colunas = ['nome', 'data', 'acoes'];
  protected readonly vagas = vagasDisponiveis;
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly turmaSelecionada = signal<Turma | null>(null);
  protected readonly inscricoes = signal<Inscricao[]>([]);
  protected readonly confirmadas = computed(() =>
    this.inscricoes().filter((i) => i.status === 'confirmada'),
  );
  protected readonly listaEspera = computed(() =>
    this.inscricoes().filter((i) => i.status === 'lista_espera'),
  );

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  protected async selecionar(turmaId: string): Promise<void> {
    this.turmaSelecionada.set(this.turmas().find((t) => t.id === turmaId) ?? null);
    this.inscricoes.set(await this.inscricaoService.listarPorTurma(turmaId));
  }

  protected async cancelar(inscricao: Inscricao): Promise<void> {
    try {
      const promovida = await this.inscricaoService.cancelar(inscricao);
      this.snackBar.open(
        promovida
          ? `Inscrição cancelada. ${promovida.nomeAluno} saiu da lista de espera e foi confirmada.`
          : 'Inscrição cancelada.',
        'OK',
        { duration: 5000 },
      );
      await this.recarregar();
    } catch (error) {
      console.error(error);
      this.snackBar.open('Não foi possível cancelar a inscrição.', 'OK', { duration: 5000 });
    }
  }

  protected async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigate(['/cursos']);
  }

  private async recarregar(): Promise<void> {
    try {
      const turmas = await this.cursoService.listarTodasTurmas();
      this.turmas.set(turmas);
      const atual = this.turmaSelecionada()?.id ?? turmas[0]?.id;
      if (atual) await this.selecionar(atual);
    } catch (error) {
      console.error(error);
      this.snackBar.open('Não foi possível carregar o painel.', 'OK', { duration: 5000 });
    }
  }
}
