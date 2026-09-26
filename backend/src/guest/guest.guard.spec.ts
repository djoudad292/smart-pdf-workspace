import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GuestGuard } from './guest.guard';
import { StoreService } from '../common/store.service';

describe('GuestGuard', () => {
  let guard: GuestGuard;
  let store: any;
  const jwt = { verify: jest.fn() };

  const contextFor = (authorization?: string) => {
    const request: any = { headers: authorization ? { authorization } : {} };
    return { switchToHttp: () => ({ getRequest: () => request }) } as any;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    store = {
      findGuestCompany: jest.fn(),
      deleteCompanyCascade: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        GuestGuard,
        { provide: StoreService, useValue: store },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    guard = module.get(GuestGuard);
  });

  it('rejects a request without a guest token', async () => {
    await expect(guard.canActivate(contextFor())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a tenant JWT on the guest endpoints', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', companyId: 'tenant-1', role: 'COMPANY_ADMIN' });
    await expect(guard.canActivate(contextFor('Bearer tenant-token'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(store.findGuestCompany).not.toHaveBeenCalled();
  });

  it('rejects a token whose sandbox no longer exists', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', companyId: 'guest_gone', guest: true });
    store.findGuestCompany.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor('Bearer guest-token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deletes the sandbox and rejects an expired session', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', companyId: 'guest_old', guest: true });
    store.findGuestCompany.mockResolvedValue({
      id: 'guest_old',
      name: 'Guest sandbox',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(guard.canActivate(contextFor('Bearer guest-token'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(store.deleteCompanyCascade).toHaveBeenCalledWith('guest_old');
  });

  it('scopes the request to the sandbox company from the token', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', companyId: 'guest_ok', guest: true });
    const ctx = contextFor('Bearer guest-token');
    store.findGuestCompany.mockResolvedValue({
      id: 'guest_ok',
      name: 'Guest sandbox',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toMatchObject({ companyId: 'guest_ok', isGuest: true, role: 'GUEST' });
  });
});
