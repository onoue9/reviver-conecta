import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  DocumentReference,
  FirestoreDataConverter,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { Turma } from '../models';
import { COLLECTIONS } from './collections';

export const turmaConverter: FirestoreDataConverter<Turma> = {
  toFirestore: ({ id: _id, ...data }: Turma) => data,
  fromFirestore: (snap) => ({ id: snap.id, ...snap.data() }) as Turma,
};

@Injectable({ providedIn: 'root' })
export class TurmaRepository {
  private readonly firestore = inject(Firestore);

  ref(turmaId: string): DocumentReference<Turma> {
    return doc(this.firestore, COLLECTIONS.turmas, turmaId).withConverter(turmaConverter);
  }

  async buscar(turmaId: string): Promise<Turma | null> {
    const snap = await getDoc(this.ref(turmaId));
    return snap.exists() ? snap.data() : null;
  }

  async listarAbertas(): Promise<Turma[]> {
    const snap = await getDocs(
      query(
        collection(this.firestore, COLLECTIONS.turmas).withConverter(turmaConverter),
        where('status', '==', 'aberta'),
      ),
    );
    return snap.docs.map((d) => d.data());
  }

  async listarTodas(): Promise<Turma[]> {
    const snap = await getDocs(
      query(
        collection(this.firestore, COLLECTIONS.turmas).withConverter(turmaConverter),
        orderBy('dataInicio'),
      ),
    );
    return snap.docs.map((d) => d.data());
  }
}
