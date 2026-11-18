import { Routes } from '@angular/router';

import { equipeGuard } from './guards/equipe.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'cursos' },
  {
    path: 'cursos',
    title: 'Cursos | Reviver Conecta',
    loadComponent: () => import('./features/cursos/cursos-page').then((m) => m.CursosPage),
  },
  {
    path: 'inscricao/:turmaId',
    title: 'Inscrição | Reviver Conecta',
    loadComponent: () => import('./features/inscricao/inscricao-page').then((m) => m.InscricaoPage),
  },
  {
    path: 'painel/login',
    title: 'Acesso da equipe | Reviver Conecta',
    loadComponent: () => import('./features/painel/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'painel',
    title: 'Painel | Reviver Conecta',
    canActivate: [equipeGuard],
    loadComponent: () => import('./features/painel/painel-page').then((m) => m.PainelPage),
  },
  { path: '**', redirectTo: 'cursos' },
];
