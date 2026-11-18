import { TestBed } from '@angular/core/testing';

import { Inscricao } from '../models';
import { InscricaoRepository } from '../repositories/inscricao.repository';
import { ListaEsperaService } from './lista-espera.service';

const espera = (id: string): Inscricao => ({
  id,
  turmaId: 't1',
  cursoId: 'c1',
  alunoId: id,
  nomeAluno: id,
  status: 'lista_espera',
  criadaEm: new Date(),
});

describe('ListaEsperaService', () => {
  let service: ListaEsperaService;
  const repo = { listarListaEspera: vi.fn(), promover: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: InscricaoRepository, useValue: repo }],
    });
    service = TestBed.inject(ListaEsperaService);
  });

  it('returns the 1-based position in the list', () => {
    const lista = [espera('a'), espera('b'), espera('c')];
    expect(service.posicao(lista, 'a')).toBe(1);
    expect(service.posicao(lista, 'c')).toBe(3);
    expect(service.posicao(lista, 'x')).toBeNull();
  });

  it('promotes the oldest waiting inscrição', async () => {
    repo.listarListaEspera.mockResolvedValue([espera('a'), espera('b')]);
    repo.promover.mockResolvedValue(true);

    const promovida = await service.promoverProximo('t1');

    expect(repo.listarListaEspera).toHaveBeenCalledWith('t1');
    expect(repo.promover).toHaveBeenCalledTimes(1);
    expect(repo.promover).toHaveBeenCalledWith('a');
    expect(promovida).toMatchObject({ id: 'a', status: 'confirmada' });
  });

  it('tries the next one when a promotion loses a race', async () => {
    repo.listarListaEspera.mockResolvedValue([espera('a'), espera('b')]);
    repo.promover.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(service.promoverProximo('t1')).resolves.toMatchObject({ id: 'b' });
  });

  it('returns null when nobody is waiting', async () => {
    repo.listarListaEspera.mockResolvedValue([]);
    await expect(service.promoverProximo('t1')).resolves.toBeNull();
    expect(repo.promover).not.toHaveBeenCalled();
  });
});
