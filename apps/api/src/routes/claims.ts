// claims.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: /api/claims CRUD routes — create, list, get, update, add events/deadlines/checklist

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ClaimsStore } from '@vetassist/claims';

// Module-level singleton store — shared across all requests for MVP in-memory storage
const store = new ClaimsStore();

// Zod schemas — validate every incoming body strictly before touching business logic
const createClaimSchema = z.object({
  condition: z.string().min(1).max(500),
  notes:     z.string().max(5000).optional(),
});

const updateClaimSchema = z.object({
  status:          z.enum(['not_started', 'gathering_evidence', 'submitted', 'pending_decision', 'rating_received', 'closed']).optional(),
  disabilityRating: z.number().int().min(0).max(100).nullable().optional(),
  notes:           z.string().max(5000).optional(),
});

const addEventSchema = z.object({
  type:        z.enum(['claim_created', 'evidence_added', 'submitted_to_va', 'c_and_p_exam_scheduled', 'c_and_p_exam_completed', 'decision_received', 'appeal_filed', 'note_added']),
  title:       z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  occurredAt:  z.string().datetime().optional(),
});

const addDeadlineSchema = z.object({
  type:             z.enum(['itf_expiration', 'c_and_p_exam', 'appeal_deadline', 'custom']),
  label:            z.string().min(1).max(200),
  dueAt:            z.string().datetime(),
  alertDaysBefore:  z.number().int().min(0).max(365).optional(),
});

const toggleChecklistSchema = z.object({
  itemId:    z.string().min(1),
  completed: z.boolean(),
});

// Not found response body — consistent error shape for all 404 responses
const NOT_FOUND_BODY = { error: 'Claim not found' } as const;

export async function claimsRoute(server: FastifyInstance): Promise<void> {
  // GET /claims — list all claims for the current session (MVP: no auth, all claims returned)
  server.get('/claims', {}, async (_req, reply) => {
    return reply.send(store.listClaims());
  });

  // POST /claims — create a new claim with default checklist
  server.post('/claims', {}, async (req, reply) => {
    const parsed = createClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const claim = store.createClaim(parsed.data);
    return reply.status(201).send(claim);
  });

  // GET /claims/:id — fetch a single claim by id
  server.get<{ Params: { id: string } }>('/claims/:id', {}, async (req, reply) => {
    const claim = store.getClaim(req.params.id);
    if (!claim) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.send(claim);
  });

  // PATCH /claims/:id — partial update (status, rating, notes)
  server.patch<{ Params: { id: string } }>('/claims/:id', {}, async (req, reply) => {
    const parsed = updateClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const updated = store.updateClaim(req.params.id, parsed.data);
    if (!updated) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.send(updated);
  });

  // DELETE /claims/:id — hard delete
  server.delete<{ Params: { id: string } }>('/claims/:id', {}, async (req, reply) => {
    const deleted = store.deleteClaim(req.params.id);
    if (!deleted) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.status(204).send();
  });

  // POST /claims/:id/events — append a timeline event
  server.post<{ Params: { id: string } }>('/claims/:id/events', {}, async (req, reply) => {
    const parsed = addEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const updated = store.addEvent(req.params.id, parsed.data);
    if (!updated) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.send(updated);
  });

  // POST /claims/:id/deadlines — attach a deadline with optional alert window
  server.post<{ Params: { id: string } }>('/claims/:id/deadlines', {}, async (req, reply) => {
    const parsed = addDeadlineSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const updated = store.addDeadline(req.params.id, parsed.data);
    if (!updated) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.send(updated);
  });

  // PATCH /claims/:id/checklist — toggle a single checklist item
  server.patch<{ Params: { id: string } }>('/claims/:id/checklist', {}, async (req, reply) => {
    const parsed = toggleChecklistSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const updated = store.toggleChecklistItem(req.params.id, parsed.data);
    if (!updated) return reply.status(404).send(NOT_FOUND_BODY);
    return reply.send(updated);
  });
}
