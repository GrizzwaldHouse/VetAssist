// server.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Fastify server bootstrap — registers plugins, routes, starts listening

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { chatRoute } from './routes/chat.js';
import { documentsRoute } from './routes/documents.js';
import { uploadRoute } from './routes/upload.js';
import { benefitsRoute } from './routes/benefits.js';
import { inlineReviewRoute } from './routes/inline-review.js';
import { generateRoute } from './routes/generate.js';
import { claimsRoute } from './routes/claims.js';
import { sharingRoute } from './routes/sharing.js';
import { communityRoute } from './routes/community.js';
import { decisionLetterRoute } from './routes/decision-letter.js';
import { learningHubRoute } from './routes/learning-hub.js';
import { faqGlossaryRoute } from './routes/faq-glossary.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const server = Fastify({
  logger: {
    // Never log request bodies — potential PII
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  },
});

async function bootstrap(): Promise<void> {
  await server.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  await server.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
  });

  await server.register(chatRoute, { prefix: '/api' });
  await server.register(documentsRoute, { prefix: '/api' });
  await server.register(uploadRoute, { prefix: '/api' });
  await server.register(benefitsRoute, { prefix: '/api' });
  await server.register(inlineReviewRoute, { prefix: '/api' });
  await server.register(generateRoute, { prefix: '/api' });
  await server.register(claimsRoute, { prefix: '/api' });
  await server.register(sharingRoute, { prefix: '/api' });
  await server.register(communityRoute, { prefix: '/api' });
  await server.register(decisionLetterRoute, { prefix: '/api' });
  await server.register(learningHubRoute, { prefix: '/api' });
  await server.register(faqGlossaryRoute, { prefix: '/api' });

  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await server.listen({ port: PORT, host: HOST });
  server.log.info(`[API] VetAssist API listening on ${HOST}:${PORT}`);
}

bootstrap().catch((err: unknown) => {
  server.log.error(err);
  process.exit(1);
});

export { server };
