import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StoreService } from '../common/store.service';

/**
 * Authorises a public demo session. A guest token is only accepted when the
 * company it points at still exists, is flagged as a sandbox, and has not
 * passed its TTL. Tenant JWTs are rejected here, and the company is taken from
 * the token only — never from the request body — so a visitor can never reach
 * another sandbox or a real tenant's data.
 */
@Injectable()
export class GuestGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private store: StoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string = request.headers?.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      throw new UnauthorizedException('Start a guest session first');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('This guest session has expired');
    }

    if (!payload?.guest || !payload?.companyId) {
      throw new UnauthorizedException('This is not a guest session');
    }

    const company = await this.store.findGuestCompany(payload.companyId);
    if (!company) {
      throw new UnauthorizedException('This guest session no longer exists');
    }
    if (!company.expiresAt || new Date(company.expiresAt).getTime() <= Date.now()) {
      await this.store.deleteCompanyCascade(company.id).catch(() => undefined);
      throw new UnauthorizedException('This guest session has expired');
    }

    request.user = {
      id: payload.sub,
      companyId: company.id,
      name: company.name,
      role: 'GUEST',
      isGuest: true,
    };
    return true;
  }
}
