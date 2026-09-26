import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, PayloadTooLargeException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GuestService } from './guest.service';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';

describe('GuestService', () => {
  let service: GuestService;
  let store: any;
  let ai: any;
  let documents: any;
  const jwt = { sign: jest.fn(() => 'guest-token') };

  const pdf = (size: number) => ({
    originalname: 'sample.pdf',
    mimetype: 'application/pdf',
    size,
    buffer: Buffer.from('%PDF-1.4 test'),
  }) as unknown as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();
    store = {
      createGuestCompany: jest.fn(),
      createUser: jest.fn().mockResolvedValue({ id: 'user-1', role: 'GUEST' }),
      createDocument: jest.fn().mockImplementation((d: any) => ({ ...d })),
      insertChunk: jest.fn(),
      deleteChunksByDocument: jest.fn(),
      deleteDocument: jest.fn(),
      countUploadedDocuments: jest.fn().mockResolvedValue(0),
      findExpiredGuestCompanyIds: jest.fn().mockResolvedValue([]),
      deleteCompanyCascade: jest.fn(),
      findDocumentsByCompany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      updateDocument: jest.fn(),
    };
    ai = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
      askCompanyDocuments: jest.fn().mockResolvedValue({ answer: 'ok', sources: [] }),
      summarizeDocument: jest.fn().mockResolvedValue('summary'),
    };
    documents = {
      upload: jest.fn().mockResolvedValue({ id: 'doc-1', status: 'ready' }),
      delete: jest.fn().mockResolvedValue({ success: true }),
      assertDocumentInCompany: jest.fn().mockResolvedValue({ id: 'doc-1', status: 'ready' }),
      chunkContent: jest.fn().mockReturnValue(['chunk']),
    };

    const module = await Test.createTestingModule({
      providers: [
        GuestService,
        { provide: StoreService, useValue: store },
        { provide: AIService, useValue: ai },
        { provide: DocumentsService, useValue: documents },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(GuestService);
  });

  it('creates an isolated sandbox with seeded samples and a guest token', async () => {
    const session = await service.createSession();

    expect(store.createGuestCompany).toHaveBeenCalledTimes(1);
    const company = store.createGuestCompany.mock.calls[0][0];
    expect(company.id).toMatch(/^guest_/);
    expect(company.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const user = store.createUser.mock.calls[0][0];
    expect(user.companyId).toBe(company.id);
    expect(user.role).toBe('GUEST');
    expect(user.email).toContain('@sandbox.invalid');

    // Two ready samples, never published to the public widget.
    expect(store.createDocument).toHaveBeenCalledTimes(2);
    for (const call of store.createDocument.mock.calls) {
      expect(call[0].companyId).toBe(company.id);
      expect(call[0].status).toBe('ready');
      expect(call[0].isSample).toBe(true);
      expect(call[0].published).toBe(false);
    }

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', companyId: company.id, guest: true }),
      expect.objectContaining({ expiresIn: expect.stringMatching(/^\d+m$/) }),
    );
    expect(session.token).toBe('guest-token');
    expect(session.companyId).toBe(company.id);
  });

  it('rejects a guest upload larger than the sandbox file cap', async () => {
    await expect(service.upload('guest_1', pdf(6 * 1024 * 1024))).rejects.toThrow(
      PayloadTooLargeException,
    );
    expect(documents.upload).not.toHaveBeenCalled();
  });

  it('rejects uploads once the per-session quota is used up', async () => {
    store.countUploadedDocuments.mockResolvedValue(3);
    await expect(service.upload('guest_1', pdf(1024))).rejects.toThrow(ForbiddenException);
    expect(documents.upload).not.toHaveBeenCalled();
  });

  it('keeps guest uploads unpublished and scoped to the session company', async () => {
    await service.upload('guest_1', pdf(1024));
    expect(documents.upload).toHaveBeenCalledWith('guest_1', expect.anything(), { published: false });
  });

  it('rejects an empty or overlong question', async () => {
    await expect(service.ask('guest_1', '   ')).rejects.toThrow(BadRequestException);
    await expect(service.ask('guest_1', 'a'.repeat(1001))).rejects.toThrow(BadRequestException);
  });

  it('answers questions from unpublished sandbox documents only', async () => {
    await service.ask('guest_1', 'How many days of annual leave?');
    expect(ai.askCompanyDocuments).toHaveBeenCalledWith(
      'guest_1',
      'How many days of annual leave?',
      false,
    );
  });

  it('only purges sandboxes whose TTL has passed', async () => {
    store.findExpiredGuestCompanyIds.mockResolvedValue(['guest_expired', 'guest_expired_2']);
    await expect(service.purgeExpired()).resolves.toBe(2);
    expect(store.deleteCompanyCascade).toHaveBeenCalledTimes(2);
    expect(store.deleteCompanyCascade).toHaveBeenCalledWith('guest_expired');
  });
});
