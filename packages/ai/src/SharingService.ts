// SharingService.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: PII-rescanning document sharing service — validates content before any share action

import { PIIDetector } from '@vetassist/pii';
import type { ShareRequest, ShareResult } from '@vetassist/shared-types';

// Max document size allowed for sharing (bytes of UTF-8 text)
const SHARE_MAX_CHARS = 50_000;

export class SharingService {
  async share(request: ShareRequest): Promise<ShareResult> {
    const { documentContent, channel, recipient } = request;

    if (!documentContent || documentContent.length === 0) {
      return this.failure(channel, false, false, 'Document content is empty.');
    }

    if (documentContent.length > SHARE_MAX_CHARS) {
      return this.failure(channel, false, false, `Document exceeds ${SHARE_MAX_CHARS.toLocaleString()} character limit for sharing.`);
    }

    // Mandatory PII re-scan before any share action — per CLAUDE.md document sharing policy
    const piiResult = PIIDetector.scan(documentContent);
    const piiFound = piiResult.hasPII;

    // Use sanitized text if PII was detected — never share raw PII
    const safeContent = piiFound ? piiResult.sanitizedText : documentContent;

    if (channel === 'email' || channel === 'sms') {
      if (!recipient || recipient.trim().length === 0) {
        return this.failure(channel, true, piiFound, `Recipient is required for ${channel} sharing.`);
      }
      if (channel === 'email' && !this.isValidEmail(recipient)) {
        return this.failure(channel, true, piiFound, 'Invalid email address.');
      }
      if (channel === 'sms' && !this.isValidPhone(recipient)) {
        return this.failure(channel, true, piiFound, 'Invalid phone number (digits only, 10-15 digits).');
      }
    }

    // For download: encode content as base64 — client decodes and triggers browser file save
    const downloadPayload = channel === 'download'
      ? Buffer.from(safeContent, 'utf-8').toString('base64')
      : null;

    return {
      success: true,
      channel,
      piiRescanned: true,
      piiFound,
      downloadPayload,
      // For email/sms: client constructs mailto:/sms: URI using the sanitized content
      message: this.successMessage(channel, recipient, piiFound),
      sharedAt: new Date().toISOString(),
    };
  }

  private failure(
    channel: ShareRequest['channel'],
    piiRescanned: boolean,
    piiFound: boolean,
    message: string,
  ): ShareResult {
    return {
      success: false,
      channel,
      piiRescanned,
      piiFound,
      downloadPayload: null,
      message,
      sharedAt: new Date().toISOString(),
    };
  }

  private successMessage(channel: ShareRequest['channel'], recipient: string | null, piiFound: boolean): string {
    const piiNote = piiFound ? ' Sensitive information was redacted before sharing.' : '';
    if (channel === 'download') return `Document ready for download.${piiNote}`;
    if (channel === 'email') return `Email prepared for ${recipient}.${piiNote}`;
    return `SMS prepared for ${recipient}.${piiNote}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }
}
