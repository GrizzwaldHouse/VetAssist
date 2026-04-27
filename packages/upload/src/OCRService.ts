// OCRService.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Extracts plain text from uploaded documents using Tesseract.js for images and pdf-parse for PDFs

import type { AcceptedMimeType } from '@vetassist/shared-types';

// Plain text files — read buffer directly as UTF-8
const TEXT_MIME_TYPES: ReadonlySet<string> = new Set(['text/plain']);

// DOCX MIME type constant — avoids magic string in switch logic
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class OCRService {
  async extractText(buffer: Buffer, mimeType: AcceptedMimeType): Promise<string> {
    if (TEXT_MIME_TYPES.has(mimeType)) {
      return buffer.toString('utf-8');
    }

    if (mimeType === DOCX_MIME) {
      return this.extractDocx(buffer);
    }

    if (mimeType === 'application/pdf') {
      return this.extractPdf(buffer);
    }

    // Images: JPEG, PNG, HEIC, TIFF — use Tesseract OCR
    return this.extractImage(buffer);
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import — pdf-parse is an optional peer dependency
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js' as string);
      const result = await pdfParse(buffer);
      return (result.text as string) ?? '';
    } catch {
      // If pdf-parse is not installed, return empty — document still stored for manual review
      return '';
    }
  }

  private async extractImage(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import — tesseract.js is an optional peer dependency
      const { createWorker } = await import('tesseract.js' as string);
      const worker = await (createWorker as (lang: string) => Promise<{ recognize: (b: Buffer) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }>)('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return data.text ?? '';
    } catch {
      // If tesseract.js is not installed, return empty
      return '';
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import — mammoth is an optional peer dependency
      const { extractRawText } = await import('mammoth' as string) as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
      const result = await extractRawText({ buffer });
      return result.value ?? '';
    } catch {
      // If mammoth is not installed, return empty
      return '';
    }
  }
}
