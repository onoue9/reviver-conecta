import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { DocumentReference, FirestoreDataConverter, doc, getDoc } from 'firebase/firestore';

import { Aluno } from '../models';
import { COLLECTIONS } from './collections';

export const alunoConverter: FirestoreDataConverter<Aluno> = {
  toFirestore: ({ id: _id, ...data }: Aluno) => {
    // Firestore rejects `undefined` values, so drop the optional email when empty.
    const { email, ...rest } = data;
    return email ? { ...rest, email } : rest;
  },
  fromFirestore: (snap) => ({ id: snap.id, ...snap.data() }) as Aluno,
};

@Injectable({ providedIn: 'root' })
export class AlunoRepository {
  private readonly firestore = inject(Firestore);

  ref(alunoId: string): DocumentReference<Aluno> {
    return doc(this.firestore, COLLECTIONS.alunos, alunoId).withConverter(alunoConverter);
  }

  async buscar(alunoId: string): Promise<Aluno | null> {
    const snap = await getDoc(this.ref(alunoId));
    return snap.exists() ? snap.data() : null;
  }
}
