// community.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Community story routes — submit, list, upvote, report, admin queue

import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { SubmitStoryRequest, StoryCategory, StoryBranch, StoryAuthorMode } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { createStory, listStories, upvoteStory, getStoryById } from '@vetassist/community';
import { moderateContent, enqueue, incrementReport, listQueue } from '@vetassist/moderation';
import { StoryBuilderHandler, createProvider, createPromptLoader } from '@vetassist/ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_BASE_PATH = path.resolve(__dirname, '../../../../claude/skills');

const STORY_CATEGORIES = ['cp_exam', 'evidence', 'appeals', 'benefits_discovery', 'transition', 'general'] as const;
const STORY_BRANCHES   = ['army', 'navy', 'marines', 'air_force', 'coast_guard', 'space_force', 'national_guard', 'reserves'] as const;
const AUTHOR_MODES     = ['anonymous', 'username', 'verified'] as const;

const SubmitStorySchema = z.object({
  title:         z.string().min(5).max(120),
  content:       z.string().min(50).max(10_000),
  category:      z.enum(STORY_CATEGORIES),
  branch:        z.enum(STORY_BRANCHES).nullable().optional(),
  tags:          z.array(z.string().max(30)).max(5).default([]),
  authorMode:    z.enum(AUTHOR_MODES).default('anonymous'),
  authorDisplay: z.string().max(50).default('Anonymous Veteran'),
  sessionId:     z.string().optional(),
});

const ReportSchema = z.object({ reason: z.string().max(200).optional() });

export const communityRoute: FastifyPluginAsync = async (fastify) => {
  const provider      = createProvider();
  const promptLoader  = createPromptLoader(SKILLS_BASE_PATH);
  const storyHandler  = new StoryBuilderHandler(provider, promptLoader);

  // POST /api/community/stories — submit a new story
  fastify.post('/community/stories', async (request, reply) => {
    const parsed = SubmitStorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid request', errors: parsed.error.issues });
    }

    const { title, content, category, branch, tags, authorMode, authorDisplay, sessionId } = parsed.data;
    const sid = sessionId ?? randomUUID();

    // Crisis gate — must fire before any processing
    const crisisResult = await CrisisDetector.detectCrisis(content);
    if (crisisResult.isCrisis) {
      eventBus.emit(EVENTS.CRISIS_DETECTED, { sessionId: sid, result: crisisResult });
      return reply.status(200).send({
        status:  'crisis',
        message: 'We noticed some concerning content. Please reach out to the Veterans Crisis Line: 988 (Press 1). Your story has not been submitted.',
      });
    }

    // PII scrub — content is sanitized before storage
    const piiResult = PIIDetector.scan(content);
    const safeContent = piiResult.hasPII ? piiResult.sanitizedText : content;
    if (piiResult.hasPII) {
      eventBus.emit(EVENTS.PII_DETECTED, {
        eventId: randomUUID(), type: 'SSN', location: 'community_post',
        action: 'redacted', timestamp: new Date().toISOString(), detectionLayer: 'server_presidio',
      });
    }

    // Layer-1 moderation — toxicity + spam + PII flags
    const modResult = moderateContent(safeContent);

    if (modResult.action === 'removed') {
      return reply.status(200).send({
        status:  'removed',
        message: 'Your submission could not be accepted due to content policy violations.',
      });
    }

    // Determine initial story status from moderation result
    const storyStatus = modResult.action === 'approved' ? 'approved' : 'pending';

    // Create story — approved stories get AI tips immediately; pending waits for admin
    const tips = storyStatus === 'approved'
      ? await storyHandler.extractTips(safeContent, category as StoryCategory)
      : [];

    const story = createStory({
      title,
      content:       safeContent,
      category:      category as StoryCategory,
      branch:        (branch ?? null) as StoryBranch | null,
      tags,
      authorMode:    authorMode as StoryAuthorMode,
      authorDisplay: authorMode === 'anonymous' ? 'Anonymous Veteran' : authorDisplay,
      status:        storyStatus,
      tips,
    });

    // Add to admin mod queue if flagged
    if (modResult.requiresAdminReview) {
      enqueue(story.id, story.title, modResult.flags, modResult.toxicityScore);
    }

    return reply.status(201).send({ status: storyStatus, story });
  });

  // GET /api/community/stories — list approved stories with optional filters
  fastify.get('/community/stories', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const category = query['category'] as StoryCategory | undefined;
    const branch   = query['branch'] as StoryBranch | undefined;

    const stories = listStories({ status: 'approved', category, branch });
    return reply.status(200).send({ stories, total: stories.length });
  });

  // GET /api/community/stories/:id — single story
  fastify.get('/community/stories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const story = getStoryById(id);
    if (!story || story.status !== 'approved') {
      return reply.status(404).send({ message: 'Story not found.' });
    }
    return reply.status(200).send(story);
  });

  // POST /api/community/stories/:id/upvote — increment upvote count
  fastify.post('/community/stories/:id/upvote', async (request, reply) => {
    const { id } = request.params as { id: string };
    const story = upvoteStory(id);
    if (!story) return reply.status(404).send({ message: 'Story not found.' });
    return reply.status(200).send({ upvotes: story.upvotes });
  });

  // POST /api/community/stories/:id/report — community report (Layer-2)
  fastify.post('/community/stories/:id/report', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = ReportSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid request' });

    const story = getStoryById(id);
    if (!story) return reply.status(404).send({ message: 'Story not found.' });

    incrementReport(id);
    return reply.status(200).send({ message: 'Report received. Our moderation team will review this content.' });
  });

  // GET /api/community/admin/queue — admin mod queue (Layer-3)
  fastify.get('/community/admin/queue', async (_request, reply) => {
    const queue = listQueue();
    return reply.status(200).send({ queue, total: queue.length });
  });
};
