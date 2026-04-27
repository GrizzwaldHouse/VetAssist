// StoryStore.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: In-memory community story store — CRUD + upvote + report operations

import { randomUUID } from 'crypto';
import type { CommunityStory, StoryStatus, StoryCategory, StoryBranch, StoryAuthorMode, StoryTip } from '@vetassist/shared-types';

// Story disclaimer appended to every post — per CLAUDE.md community content policy
const STORY_DISCLAIMER = 'This is one veteran\'s personal experience. Results vary based on individual circumstances. This is not legal or medical advice.';

// MVP: in-memory store — Prisma/DB migration in Phase 4
const stories = new Map<string, CommunityStory>();

export function createStory(params: {
  title: string;
  content: string;
  category: StoryCategory;
  branch: StoryBranch | null;
  tags: readonly string[];
  authorMode: StoryAuthorMode;
  authorDisplay: string;
  status: StoryStatus;
  tips: readonly StoryTip[];
}): CommunityStory {
  const story: CommunityStory = {
    id:            randomUUID(),
    title:         params.title,
    content:       params.content,
    category:      params.category,
    branch:        params.branch,
    tags:          params.tags,
    authorMode:    params.authorMode,
    authorDisplay: params.authorDisplay,
    status:        params.status,
    upvotes:       0,
    tips:          params.tips,
    disclaimer:    STORY_DISCLAIMER,
    submittedAt:   new Date().toISOString(),
    approvedAt:    params.status === 'approved' ? new Date().toISOString() : null,
  };
  stories.set(story.id, story);
  return story;
}

export function getStoryById(id: string): CommunityStory | null {
  return stories.get(id) ?? null;
}

export function listStories(filters?: {
  status?: StoryStatus;
  category?: StoryCategory;
  branch?: StoryBranch;
}): readonly CommunityStory[] {
  let result = Array.from(stories.values());
  if (filters?.status) result = result.filter((s) => s.status === filters.status);
  if (filters?.category) result = result.filter((s) => s.category === filters.category);
  if (filters?.branch) result = result.filter((s) => s.branch === filters.branch);
  return result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export function upvoteStory(id: string): CommunityStory | null {
  const story = stories.get(id);
  if (!story) return null;
  const updated: CommunityStory = { ...story, upvotes: story.upvotes + 1 };
  stories.set(id, updated);
  return updated;
}

export function updateStoryStatus(id: string, status: StoryStatus): CommunityStory | null {
  const story = stories.get(id);
  if (!story) return null;
  const updated: CommunityStory = {
    ...story,
    status,
    approvedAt: status === 'approved' ? new Date().toISOString() : story.approvedAt,
  };
  stories.set(id, updated);
  return updated;
}

export function attachTips(id: string, tips: readonly StoryTip[]): CommunityStory | null {
  const story = stories.get(id);
  if (!story) return null;
  const updated: CommunityStory = { ...story, tips };
  stories.set(id, updated);
  return updated;
}
