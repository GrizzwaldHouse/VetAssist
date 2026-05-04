// sharing.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/documents/share route test suite — document sharing with PII rescanning

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sharingRoute } from '../sharing.js';
import { CrisisDetector } from '@vetassist/crisis';
import { SharingService } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  return {
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

describe('sharingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('rejects empty document content', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentContent: '', documentTitle: 'Test', channel: 'email' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects empty document title', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentContent: 'test', documentTitle: '', channel: 'email' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid channel', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'fax' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects recipient over 320 characters', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'email', recipient: 'a'.repeat(321) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('accepts valid email share request', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue({ success: true, channel: 'email', piiRescanned: true, piiFound: false, downloadPayload: null, sharedAt: new Date().toISOString() } as any);

      await handler({ body: { documentContent: 'test content', documentTitle: 'Test Doc', channel: 'email', recipient: 'test@example.com' } }, reply);

      expect(reply.send).toHaveBeenCalled();
    });

    it('accepts download channel without recipient', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue({ success: true, channel: 'download', piiRescanned: true, piiFound: false, downloadPayload: { url: 'data:text/plain,test' }, sharedAt: new Date().toISOString() } as any);

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'download' } }, reply);

      expect(reply.send).toHaveBeenCalled();
    });
  });

  describe('Crisis Detection', () => {
    it('blocks sharing when crisis detected', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: true, matchedPhrases: ['end my life'] });

      await handler({ body: { documentContent: 'I want to end my life', documentTitle: 'Test', channel: 'email', recipient: 'test@example.com' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('988'),
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.CRISIS_DETECTED, expect.any(Object));
    });
  });

  describe('Document Sharing', () => {
    it('shares document via email successfully', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { send: vi.fn() };
      const mockResult = { success: true, channel: 'email', piiRescanned: true, piiFound: false, downloadPayload: null, sharedAt: new Date().toISOString() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue(mockResult as any);

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'email', recipient: 'test@example.com' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('detects PII in shared document and emits event', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue({ success: true, channel: 'email', piiRescanned: true, piiFound: true, downloadPayload: null, sharedAt: new Date().toISOString() } as any);

      await handler({ body: { documentContent: 'SSN: 123-45-6789', documentTitle: 'Test', channel: 'email', recipient: 'test@example.com' } }, reply);

      expect(emitSpy).toHaveBeenCalledWith(EVENTS.PII_DETECTED, expect.objectContaining({ type: 'SSN' }));
    });

    it('shares document via SMS successfully', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue({ success: true, channel: 'sms', piiRescanned: true, piiFound: false, downloadPayload: null, sharedAt: new Date().toISOString() } as any);

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'sms', recipient: '+15551234567' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'sms', success: true })
      );
    });

    it('shares document via download successfully', async () => {
      const mockFastify = createMockFastify();
      await sharingRoute(mockFastify as unknown as Parameters<typeof sharingRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/share')?.[2];
      const reply = { send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(SharingService.prototype, 'share').mockResolvedValue({ success: true, channel: 'download', piiRescanned: true, piiFound: false, downloadPayload: { url: 'data:text/plain,test' }, sharedAt: new Date().toISOString() } as any);

      await handler({ body: { documentContent: 'test', documentTitle: 'Test', channel: 'download' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'download', downloadPayload: expect.any(Object) })
      );
    });
  });
});
