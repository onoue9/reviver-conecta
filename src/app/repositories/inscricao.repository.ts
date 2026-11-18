import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  DocumentReference,
  FirestoreDataConverter,
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { Aluno, Inscricao, StatusInscricao, Turma, inscricaoId } from '../models';
import { AlunoRepository } from './aluno.repository';
import { COLLECTIONS } from './collections';
import { InscricaoDuplicadaError, TurmaEncerradaError, TurmaNaoEncontradaError } from './errors';
import { TurmaRepository } from './turma.repository';

const inscricaoConverter: FirestoreDataConverter<Inscricao> = {
  toFirestore: ({ id: _id, ...data }: Inscricao) => data,
  fromFirestore: (snap) => {
    const data = snap.data();
    const criadaEm = data['criadaEm'] as Timestamp | null;
    return { ...data, id: snap.id, criadaEm: criadaEm?.toDate() ?? new Date() } as Inscricao;
  },
};

export interface RegistroInscricao {
  turmaId: string;
  aluno: Aluno;
  /** Business rule deciding the status from the turma state read inside the transaction. */
  decidirStatus: (turma: Turma) => Exclude<StatusInscricao, 'cancelada'>;
}

@Injectable({ providedIn: 'root' })
export class InscricaoRepository {
  private readonly firestore = inject(Firestore);
  private readonly turmas = inject(TurmaRepository);
  private readonly alunos = inject(AlunoRepository);

  private ref(id: string): DocumentReference<Inscricao> {
    return doc(this.firestore, COLLECTIONS.inscricoes, id).withConverter(inscricaoConverter);
  }

  /**
   * Atomically saves the aluno, creates the inscrição and, when confirmed,
   * reserves a seat on the turma. Returns the resulting status.
   */
  registrar({ turmaId, aluno, decidirStatus }: RegistroInscricao): Promise<StatusInscricao> {
    return runTransaction(this.firestore, async (tx) => {
      const turmaRef = this.turmas.ref(turmaId);
      const turmaSnap = await tx.get(turmaRef);
      if (!turmaSnap.exists()) throw new TurmaNaoEncontradaError(turmaId);
      const turma = turmaSnap.data();
      if (turma.status !== 'aberta') throw new TurmaEncerradaError(turmaId);

      const ref = this.ref(inscricaoId(turmaId, aluno.id));
      if ((await tx.get(ref)).exists()) throw new InscricaoDuplicadaError();

      const status = decidirStatus(turma);
      tx.set(this.alunos.ref(aluno.id), aluno);
      tx.set(ref.withConverter(null), {
        turmaId,
        cursoId: turma.cursoId,
        alunoId: aluno.id,
        nomeAluno: aluno.nome,
        status,
        criadaEm: serverTimestamp(),
      });
      if (status === 'confirmada') {
        tx.update(turmaRef, { vagasOcupadas: turma.vagasOcupadas + 1 });
      }
      return status;
    });
  }

  async listarPorTurma(turmaId: string): Promise<Inscricao[]> {
    const snap = await getDocs(
      query(
        collection(this.firestore, COLLECTIONS.inscricoes).withConverter(inscricaoConverter),
        where('turmaId', '==', turmaId),
        orderBy('criadaEm'),
      ),
    );
    return snap.docs.map((d) => d.data());
  }

  /** Waiting list for a turma, oldest first (first come, first served). */
  async listarListaEspera(turmaId: string): Promise<Inscricao[]> {
    const snap = await getDocs(
      query(
        collection(this.firestore, COLLECTIONS.inscricoes).withConverter(inscricaoConverter),
        where('turmaId', '==', turmaId),
        where('status', '==', 'lista_espera'),
        orderBy('criadaEm'),
      ),
    );
    return snap.docs.map((d) => d.data());
  }

  /** Cancels an inscrição, releasing the seat if it was confirmed. Returns the previous status. */
  cancelar(id: string): Promise<StatusInscricao | null> {
    return runTransaction(this.firestore, async (tx) => {
      const ref = this.ref(id);
      const snap = await tx.get(ref);
      if (!snap.exists()) return null;
      const inscricao = snap.data();
      if (inscricao.status === 'cancelada') return 'cancelada';

      if (inscricao.status === 'confirmada') {
        const turmaRef = this.turmas.ref(inscricao.turmaId);
        const turma = (await tx.get(turmaRef)).data();
        if (turma) {
          tx.update(turmaRef, { vagasOcupadas: Math.max(turma.vagasOcupadas - 1, 0) });
        }
      }
      tx.update(ref, { status: 'cancelada' });
      return inscricao.status;
    });
  }

  /**
   * Moves a waiting-list inscrição to confirmed if the turma still has a free seat.
   * Returns false when the seat was taken or the inscrição is no longer waiting.
   */
  promover(id: string): Promise<boolean> {
    return runTransaction(this.firestore, async (tx) => {
      const ref = this.ref(id);
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().status !== 'lista_espera') return false;

      const turmaRef = this.turmas.ref(snap.data().turmaId);
      const turma = (await tx.get(turmaRef)).data();
      if (!turma || turma.vagasOcupadas >= turma.vagasTotais) return false;

      tx.update(turmaRef, { vagasOcupadas: turma.vagasOcupadas + 1 });
      tx.update(ref, { status: 'confirmada' });
      return true;
    });
  }
}
