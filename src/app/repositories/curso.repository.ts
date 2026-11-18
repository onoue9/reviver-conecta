import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  FirestoreDataConverter,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { Curso } from '../models';
import { COLLECTIONS } from './collections';

const cursoConverter: FirestoreDataConverter<Curso> = {
  toFirestore: ({ id: _id, ...data }: Curso) => data,
  fromFirestore: (snap) => ({ id: snap.id, ...snap.data() }) as Curso,
};

@Injectable({ providedIn: 'root' })
export class CursoRepository {
  private readonly firestore = inject(Firestore);

  async listarAtivos(): Promise<Curso[]> {
    const ref = collection(this.firestore, COLLECTIONS.cursos).withConverter(cursoConverter);
    const snap = await getDocs(query(ref, where('ativo', '==', true), orderBy('nome')));
    return snap.docs.map((d) => d.data());
  }
}
