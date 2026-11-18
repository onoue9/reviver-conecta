import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc } from 'firebase/firestore';

import { UsuarioEquipe } from '../models';
import { COLLECTIONS } from './collections';

@Injectable({ providedIn: 'root' })
export class UsuarioEquipeRepository {
  private readonly firestore = inject(Firestore);

  /** Returns the team profile for the uid, or null when the user is not on the team. */
  async buscar(uid: string): Promise<UsuarioEquipe | null> {
    const snap = await getDoc(doc(this.firestore, COLLECTIONS.usuariosEquipe, uid));
    return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UsuarioEquipe) : null;
  }
}
