import { TestBed } from '@angular/core/testing';

import { DadosAluno, Inscricao, Turma } from '../models';
import { InscricaoRepository, RegistroInscricao } from '../repositories/inscricao.repository';
import { AuthService } from './auth.service';
import { DadosInvalidosError, InscricaoService } from './inscricao.service';
import { ListaEsperaService } from './lista-espera.service';

const turma = (vagasOcupadas: number): Turma => ({
  id: 't1',
  cursoId: 'c1',
  nome: 'Turma',
  horario: 'Seg 19h',
  dataInicio: '2027-02-01',
  vagasTotais: 2,
  vagasOcupadas,
  status: 'aberta',
});

const dados = (override: Partial<DadosAluno> = {}): DadosAluno => ({
  nome: '  Maria da Silva ',
  dataNascimento: '2005-03-10',
  telefone: '(11) 91234-5678',
  email: '',
  bairro: ' Capão Redondo ',
  consentimentoLgpd: true,
  ...override,
});

const inscricao = (status: Inscricao['status']): Inscricao => ({
  id: 't1_uid1',
  turmaId: 't1',
  cursoId: 'c1',
  alunoId: 'uid1',
  nomeAluno: 'Maria',
  status,
  criadaEm: new Date('2027-01-01T10:00:00Z'),
});

describe('InscricaoService', () => {
  let service: InscricaoService;
  const repo = { registrar: vi.fn(), cancelar: vi.fn(), listarPorTurma: vi.fn() };
  const auth = { garantirSessaoAluno: vi.fn() };
  const listaEspera = { promoverProximo: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    auth.garantirSessaoAluno.mockResolvedValue('uid1');
    TestBed.configureTestingModule({
      providers: [
        { provide: InscricaoRepository, useValue: repo },
        { provide: AuthService, useValue: auth },
        { provide: ListaEsperaService, useValue: listaEspera },
      ],
    });
    service = TestBed.inject(InscricaoService);
  });

  describe('decidirStatus', () => {
    it('confirms while there are free seats', () => {
      expect(service.decidirStatus(turma(1))).toBe('confirmada');
    });

    it('sends to the waiting list when the turma is full', () => {
      expect(service.decidirStatus(turma(2))).toBe('lista_espera');
    });
  });

  describe('inscrever', () => {
    it('registers the normalized aluno under the anonymous session uid', async () => {
      repo.registrar.mockResolvedValue('confirmada');

      await expect(service.inscrever('t1', dados())).resolves.toBe('confirmada');

      const registro = repo.registrar.mock.calls[0][0] as RegistroInscricao;
      expect(registro.turmaId).toBe('t1');
      expect(registro.aluno).toEqual({
        id: 'uid1',
        nome: 'Maria da Silva',
        dataNascimento: '2005-03-10',
        telefone: '11912345678',
        bairro: 'Capão Redondo',
        consentimentoLgpd: true,
      });
      expect(registro.decidirStatus(turma(2))).toBe('lista_espera');
    });

    it('keeps a trimmed e-mail when informed', async () => {
      repo.registrar.mockResolvedValue('lista_espera');
      await service.inscrever('t1', dados({ email: ' maria@exemplo.org ' }));
      expect((repo.registrar.mock.calls[0][0] as RegistroInscricao).aluno.email).toBe(
        'maria@exemplo.org',
      );
    });

    it.each([
      ['short name', { nome: 'Al' }],
      ['bad birth date', { dataNascimento: '10/03/2005' }],
      ['phone without area code', { telefone: '91234-567' }],
      ['empty neighbourhood', { bairro: '  ' }],
      ['missing LGPD consent', { consentimentoLgpd: false as unknown as true }],
    ])('rejects %s without touching auth or storage', async (_caso, override) => {
      await expect(service.inscrever('t1', dados(override))).rejects.toBeInstanceOf(
        DadosInvalidosError,
      );
      expect(auth.garantirSessaoAluno).not.toHaveBeenCalled();
      expect(repo.registrar).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('promotes the next on the waiting list when a confirmed seat is released', async () => {
      const promovida = { ...inscricao('confirmada'), id: 't1_uid2', nomeAluno: 'João' };
      repo.cancelar.mockResolvedValue('confirmada');
      listaEspera.promoverProximo.mockResolvedValue(promovida);

      await expect(service.cancelar(inscricao('confirmada'))).resolves.toBe(promovida);
      expect(repo.cancelar).toHaveBeenCalledWith('t1_uid1');
      expect(listaEspera.promoverProximo).toHaveBeenCalledWith('t1');
    });

    it('does not promote anyone when a waiting-list entry is removed', async () => {
      repo.cancelar.mockResolvedValue('lista_espera');

      await expect(service.cancelar(inscricao('lista_espera'))).resolves.toBeNull();
      expect(listaEspera.promoverProximo).not.toHaveBeenCalled();
    });
  });
});
