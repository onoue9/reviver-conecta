import { Injectable, computed, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { UsuarioEquipe } from '../models';
import { UsuarioEquipeRepository } from '../repositories/usuario-equipe.repository';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly equipeRepo = inject(UsuarioEquipeRepository);

  private readonly _usuario = signal<User | null>(null);
  private readonly _equipe = signal<UsuarioEquipe | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly equipe = this._equipe.asReadonly();
  readonly ehEquipe = computed(() => this._equipe() !== null);

  /** Resolves once the first auth state (and team profile) is known. */
  readonly pronto: Promise<void>;

  constructor() {
    this.pronto = new Promise((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        this._usuario.set(user);
        this._equipe.set(await this.carregarEquipe(user));
        resolve();
      });
    });
  }

  /** Signs a team member in with e-mail and password. Fails if the user is not on the team. */
  async entrarEquipe(email: string, senha: string): Promise<UsuarioEquipe> {
    const { user } = await signInWithEmailAndPassword(this.auth, email, senha);
    const equipe = await this.carregarEquipe(user);
    if (!equipe) {
      await signOut(this.auth);
      throw new Error('Este usuário não faz parte da equipe da ONG.');
    }
    this._usuario.set(user);
    this._equipe.set(equipe);
    return equipe;
  }

  async sair(): Promise<void> {
    await signOut(this.auth);
    this._usuario.set(null);
    this._equipe.set(null);
  }

  /**
   * Returns the uid used to register an aluno. Students do not create accounts:
   * an anonymous session is opened so security rules can tie the data to its owner.
   */
  async garantirSessaoAluno(): Promise<string> {
    await this.pronto;
    const atual = this.auth.currentUser;
    if (atual) return atual.uid;
    const { user } = await signInAnonymously(this.auth);
    return user.uid;
  }

  private async carregarEquipe(user: User | null): Promise<UsuarioEquipe | null> {
    if (!user || user.isAnonymous) return null;
    try {
      return await this.equipeRepo.buscar(user.uid);
    } catch (error) {
      console.error('Falha ao carregar o perfil da equipe', error);
      return null;
    }
  }
}
