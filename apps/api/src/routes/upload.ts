// upload.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: /api/documents/upload route — multipart file upload with OCR + PII pipeline

import type { FastifyPluginAsync } from 'fastify';
import { UploadService } from '@vetassist/upload';
import type { UploadResponse } from '@vetassist/shared-types';
import { UPLOAD_CONFIG } from '@vetassist/shared-config';

const MISSING_FILE_MSG = 'No file provided';
const UPLOAD_SUCCESS_MSG = 'Document uploaded and processed successfully';
const UPLOAD_PII_MSG = 'Document uploaded. Sensitive information was automatically redacted before processing.';

const uploadService = new UploadService();

export const uploadRoute: FastifyPluginAsync = async (fastify) => {
  await fastify.register(import('@fastify/multipart'), {
    limits: { fileSize: UPLOAD_CONFIG.maxFileSizeBytes },
  });

  fastify.post<{ Reply: UploadResponse }>(
    '/documents/upload',
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          documentId: '',
          status: 'error',
          piiRedacted: false,
          message: MISSING_FILE_MSG,
        });
      }

      const buffer = await file.toBuffer();
      const document = await uploadService.processUpload(buffer, file.mimetype, file.filename);

      const response: UploadResponse = {
        documentId: document.id,
        status: document.status,
        piiRedacted: document.piiRedacted,
        message: document.piiRedacted ? UPLOAD_PII_MSG : UPLOAD_SUCCESS_MSG,
      };

      return reply.status(201).send(response);
    },
  );

  fastify.get<{ Params: { id: string }; Reply: { documentId: string; status: string } }>(
    '/documents/:id/status',
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({ documentId: id, status: 'ready' });
    },
  );
};
