import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { equipeGuard } from './equipe.guard';

describe('equipeGuard', () => {
  function run(ehEquipe: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { pronto: Promise.resolve(), ehEquipe: () => ehEquipe } },
      ],
    });
    return TestBed.runInInjectionContext(() => equipeGuard({} as never, {} as never));
  }

  it('lets team members in', async () => {
    await expect(run(true)).resolves.toBe(true);
  });

  it('redirects everyone else to the team login', async () => {
    const result = (await run(false)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/painel/login');
  });
});
