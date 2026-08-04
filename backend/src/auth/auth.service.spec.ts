import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { StoreService } from '../common/store.service';
import { MailService } from '../common/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  const store = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findCompanyBySlug: jest.fn(),
    createCompany: jest.fn(),
    createUser: jest.fn(),
    createPasswordReset: jest.fn(),
    consumePasswordReset: jest.fn(),
    updatePassword: jest.fn(),
    revokeUserTokens: jest.fn(),
  };
  const jwt = { sign: jest.fn(() => 'signed-token'), verify: jest.fn() };
  const mail = { buildResetEmail: jest.fn(), buildInviteEmail: jest.fn(), send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: StoreService, useValue: store },
        { provide: JwtService, useValue: jwt },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects registration for an existing email', async () => {
    store.findUserByEmail.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await expect(
      service.register({ email: 'a@b.c', password: 'secret1', name: 'A', companyName: 'C' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('returns success for forgot-password when the email does not exist (no email leak)', async () => {
    store.findUserByEmail.mockResolvedValue(null);
    await expect(service.forgotPassword('nobody@nowhere.com')).resolves.toEqual({ success: true });
    expect(store.createPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects a reset password that is too short', async () => {
    await expect(service.resetPassword('token', 'short')).rejects.toThrow(BadRequestException);
  });
});
