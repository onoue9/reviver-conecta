import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Only team members (non-anonymous users listed in `usuariosEquipe`) can open the panel. */
export const equipeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pronto;
  return auth.ehEquipe() ? true : router.createUrlTree(['/painel/login']);
};
