// apiClient.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Type-safe API client for the VetAssist backend — all fetch logic lives here

import type {
  FAQEntry,
  FAQListResponse,
  FAQCategory,
  GlossaryTerm,
  GlossaryListResponse,
  VAWorkaround,
  CommunityStory,
  StoryCategory,
  StoryBranch,
  SubmitStoryRequest,
  BenefitV2,
  BenefitCategory,
  EligibilityAnswers,
  EligibilityResult,
  UploadResponse,
  InlineReviewResult,
  InlineDiff,
  AuditEntry,
  ReviewAuditTrail,
  DiffDecision,
  GenerateDocumentRequest,
  GeneratedDocument,
  WizardDocType,
  Claim,
  ClaimStatus,
  ClaimEvent,
  CreateClaimRequest,
  UpdateClaimRequest,
  AddEventRequest,
  AddDeadlineRequest,
  ClaimDeadline,
  ChecklistItem,
  ToggleChecklistRequest,
  ShareChannel,
  ShareResult,
  DecisionLetterAnalysis,
  LearningResource,
  LearningResourceTopic,
  LearningResourceType,
  LearningDifficultyLevel,
  LearningHubResponse,
  VREGuideResponse,
  VREEligibilityInput,
  VREEligibilityResult,
  VRETrack,
  VRETrackId,
  VREDischargeType,
  AnalyticsEvent,
  AnalyticsConsent,
  UsageAggregates,
  GrantReport,
} from '@vetassist/shared-types';

// Re-export shared types so callers can import them from a single apiClient import
export type {
  CommunityStory,
  StoryCategory,
  StoryBranch,
  SubmitStoryRequest,
  BenefitV2,
  BenefitCategory,
  EligibilityAnswers,
  EligibilityResult,
  UploadResponse,
  InlineReviewResult,
  InlineDiff,
  AuditEntry,
  ReviewAuditTrail,
  DiffDecision,
  GenerateDocumentRequest,
  GeneratedDocument,
  WizardDocType,
  // Claims Tracker types
  Claim,
  ClaimStatus,
  ClaimEvent,
  CreateClaimRequest,
  UpdateClaimRequest,
  AddEventRequest,
  AddDeadlineRequest,
  ClaimDeadline,
  ChecklistItem,
  ToggleChecklistRequest,
  // Document sharing types
  ShareChannel,
  ShareResult,
  // Decision letter analysis types
  DecisionLetterAnalysis,
  // Learning Hub types
  LearningResource,
  LearningResourceTopic,
  LearningResourceType,
  LearningDifficultyLevel,
  LearningHubResponse,
  // FAQ & Glossary types
  FAQEntry,
  FAQListResponse,
  FAQCategory,
  GlossaryTerm,
  GlossaryListResponse,
  VAWorkaround,
  // VR&E Chapter 31 types
  VREGuideResponse,
  VREEligibilityInput,
  VREEligibilityResult,
  VRETrack,
  VRETrackId,
  VREDischargeType,
  // Analytics types
  AnalyticsEvent,
  AnalyticsConsent,
  UsageAggregates,
  GrantReport,
};

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

export interface ChatApiRequest {
  readonly text: string;
  readonly sessionId?: string;
  readonly userId?: string;
}

export interface ChatApiResponse {
  readonly sessionId: string;
  readonly text: string;
  readonly citations: readonly string[];
  readonly compliancePassed: boolean;
  readonly isCrisis: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface DocumentReviewRequest {
  readonly text: string;
  readonly scoringMode?: 'encouraging' | 'strict';
  readonly sessionId?: string;
}

export interface ScoreCategory {
  readonly name: string;
  readonly score: number;
  readonly feedback: string;
}

export interface DocumentSuggestion {
  readonly id: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly text: string;
  readonly cfrCitation: string | null;
}

export interface DocumentReviewResponse {
  readonly overall: number;
  readonly mode: 'encouraging' | 'strict';
  readonly categories: readonly ScoreCategory[];
  readonly suggestions: readonly DocumentSuggestion[];
}

async function reviewDocument(request: DocumentReviewRequest): Promise<DocumentReviewResponse> {
  const response = await fetch(`${API_BASE}/documents/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Request failed');
  }

  return response.json() as Promise<DocumentReviewResponse>;
}

async function sendChat(request: ChatApiRequest): Promise<ChatApiResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Request failed');
  }

  return response.json() as Promise<ChatApiResponse>;
}

// Upload a document file — multipart/form-data POST, returns UploadResponse
async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    // Do not set Content-Type manually — browser must set the boundary for multipart
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Upload failed');
  }

  return response.json() as Promise<UploadResponse>;
}

// Search benefits by keyword, optional category filter, optional state code
async function searchBenefits(
  query: string,
  category?: string,
  state?: string,
): Promise<BenefitV2[]> {
  const params = new URLSearchParams({ q: query });
  if (category) params.set('category', category);
  if (state) params.set('state', state);

  const response = await fetch(`${API_BASE}/benefits/search?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Search failed');
  }

  return response.json() as Promise<BenefitV2[]>;
}

// Fetch the curated hidden-gems benefits list
async function getHiddenGems(): Promise<BenefitV2[]> {
  const response = await fetch(`${API_BASE}/benefits/hidden-gems`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Request failed');
  }

  return response.json() as Promise<BenefitV2[]>;
}

// Fetch a single benefit by database ID
async function getBenefitById(id: string): Promise<BenefitV2> {
  const response = await fetch(`${API_BASE}/benefits/${encodeURIComponent(id)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Not found');
  }

  return response.json() as Promise<BenefitV2>;
}

// Run eligibility check — returns matched benefits
async function checkEligibility(answers: EligibilityAnswers): Promise<EligibilityResult> {
  const response = await fetch(`${API_BASE}/benefits/eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Eligibility check failed');
  }

  return response.json() as Promise<EligibilityResult>;
}

// Submit document text for inline diff review — returns per-span diffs with offsets
async function reviewDocumentInline(
  text: string,
  scoringMode: 'encouraging' | 'strict' = 'encouraging',
  sessionId?: string,
): Promise<InlineReviewResult> {
  const response = await fetch(`${API_BASE}/documents/review/inline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, scoringMode, sessionId }),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Inline review failed');
  }

  return response.json() as Promise<InlineReviewResult>;
}

// Generate a VA document via the guided wizard — returns scored GeneratedDocument
async function generateDocument(request: GenerateDocumentRequest): Promise<GeneratedDocument> {
  const response = await fetch(`${API_BASE}/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Document generation failed');
  }

  return response.json() as Promise<GeneratedDocument>;
}

// ── Claims Tracker API methods ─────────────────────────────────────────────────

// Fetch all claims — MVP returns all, auth-scoped in a future sprint
async function listClaims(): Promise<Claim[]> {
  const response = await fetch(`${API_BASE}/claims`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load claims');
  }

  return response.json() as Promise<Claim[]>;
}

// Create a new claim — returns the seeded claim with default checklist
async function createClaim(req: CreateClaimRequest): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to create claim');
  }

  return response.json() as Promise<Claim>;
}

// Partial update of status, rating, or notes
async function updateClaim(id: string, req: UpdateClaimRequest): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to update claim');
  }

  return response.json() as Promise<Claim>;
}

// Append a timeline event to the claim
async function addClaimEvent(id: string, req: AddEventRequest): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${encodeURIComponent(id)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to add event');
  }

  return response.json() as Promise<Claim>;
}

// Add a deadline alert to the claim
async function addDeadlineToClaim(id: string, req: AddDeadlineRequest): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${encodeURIComponent(id)}/deadlines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to add deadline');
  }

  return response.json() as Promise<Claim>;
}

// Toggle a checklist item's completed state
async function toggleChecklistItem(id: string, req: ToggleChecklistRequest): Promise<Claim> {
  const response = await fetch(`${API_BASE}/claims/${encodeURIComponent(id)}/checklist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to update checklist');
  }

  return response.json() as Promise<Claim>;
}

// Hard-delete a claim — no undo in MVP
async function deleteClaim(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/claims/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to delete claim');
  }
}

// ── Community API methods ──────────────────────────────────────────────────────

// Submit a new veteran story — returns status + story object
async function submitStory(req: SubmitStoryRequest): Promise<{ status: string; story?: CommunityStory; message?: string }> {
  const response = await fetch(`${API_BASE}/community/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Submit failed');
  }
  return response.json() as Promise<{ status: string; story?: CommunityStory; message?: string }>;
}

// List approved community stories with optional category/branch filter
async function listStories(category?: StoryCategory, branch?: StoryBranch): Promise<CommunityStory[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (branch) params.set('branch', branch);
  const qs = params.toString();
  const response = await fetch(`${API_BASE}/community/stories${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load stories');
  }
  const data = await response.json() as { stories: CommunityStory[] };
  return data.stories;
}

// Upvote a story — returns updated upvote count
async function upvoteStory(id: string): Promise<{ upvotes: number }> {
  const response = await fetch(`${API_BASE}/community/stories/${encodeURIComponent(id)}/upvote`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Upvote failed');
  }
  return response.json() as Promise<{ upvotes: number }>;
}

// Report a story for moderation review
async function reportStory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/community/stories/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Report failed');
  }
}

// Submit a VA decision letter for AI analysis — returns per-condition breakdown, combined rating, appeal options
async function analyzeDecisionLetter(
  documentText: string,
  sessionId?: string,
): Promise<DecisionLetterAnalysis & { crisisDetected?: boolean; piiRedacted?: boolean }> {
  const response = await fetch(`${API_BASE}/documents/decision-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentText, sessionId }),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Analysis failed');
  }

  return response.json() as Promise<DecisionLetterAnalysis & { crisisDetected?: boolean; piiRedacted?: boolean }>;
}

// ── Learning Hub API methods ───────────────────────────────────────────────────

// List learning resources with optional topic/type/difficulty/keyword filters
async function listLearningResources(
  topic?: LearningResourceTopic,
  type?: LearningResourceType,
  difficulty?: LearningDifficultyLevel,
  q?: string,
): Promise<LearningHubResponse> {
  const params = new URLSearchParams();
  if (topic)      params.set('topic', topic);
  if (type)       params.set('type', type);
  if (difficulty) params.set('difficulty', difficulty);
  if (q)          params.set('q', q);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/learning${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load resources');
  }

  return response.json() as Promise<LearningHubResponse>;
}

// Fetch a single learning resource by ID
async function getLearningResourceById(id: string): Promise<LearningResource> {
  const response = await fetch(`${API_BASE}/learning/${encodeURIComponent(id)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Resource not found');
  }

  return response.json() as Promise<LearningResource>;
}

// Share a document via email, SMS, or download — PII is re-scanned server-side before any share
async function shareDocument(
  documentContent: string,
  documentTitle: string,
  channel: ShareChannel,
  recipient: string | null,
  sessionId?: string,
): Promise<ShareResult> {
  const response = await fetch(`${API_BASE}/documents/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentContent, documentTitle, channel, recipient, sessionId }),
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Share failed');
  }

  return response.json() as Promise<ShareResult>;
}

// ── FAQ & Glossary API methods ─────────────────────────────────────────────────

async function getFAQ(
  page = 1,
  category?: FAQCategory,
  q?: string,
): Promise<FAQListResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set('category', category);
  if (q)        params.set('q', q);

  const response = await fetch(`${API_BASE}/faq?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load FAQ');
  }

  return response.json() as Promise<FAQListResponse>;
}

async function searchFAQ(q: string): Promise<FAQEntry[]> {
  const response = await fetch(`${API_BASE}/faq/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'FAQ search failed');
  }

  return response.json() as Promise<FAQEntry[]>;
}

async function upvoteFAQ(id: string): Promise<{ id: string; upvotes: number }> {
  const response = await fetch(`${API_BASE}/faq/${encodeURIComponent(id)}/upvote`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Upvote failed');
  }

  return response.json() as Promise<{ id: string; upvotes: number }>;
}

async function getGlossary(): Promise<GlossaryListResponse> {
  const response = await fetch(`${API_BASE}/glossary`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load glossary');
  }

  return response.json() as Promise<GlossaryListResponse>;
}

async function searchGlossary(q: string): Promise<GlossaryTerm[]> {
  const response = await fetch(`${API_BASE}/glossary/search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Glossary search failed');
  }

  return response.json() as Promise<GlossaryTerm[]>;
}

async function getGlossaryByLetter(letter: string): Promise<GlossaryTerm[]> {
  const response = await fetch(`${API_BASE}/glossary/letter/${encodeURIComponent(letter)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Glossary lookup failed');
  }

  return response.json() as Promise<GlossaryTerm[]>;
}

async function getWorkarounds(): Promise<VAWorkaround[]> {
  const response = await fetch(`${API_BASE}/workarounds`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load workarounds');
  }

  return response.json() as Promise<VAWorkaround[]>;
}

async function getVREGuide(): Promise<VREGuideResponse> {
  const response = await fetch(`${API_BASE}/vre/guide`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Failed to load VR&E guide');
  }

  return response.json() as Promise<VREGuideResponse>;
}

async function checkVREEligibility(input: VREEligibilityInput): Promise<VREEligibilityResult> {
  const params = new URLSearchParams({
    disabilityRating:        String(input.disabilityRating),
    hasMemorandumRating:     String(input.hasMemorandumRating),
    dischargeType:           input.dischargeType,
    hasEmploymentHandicap:   String(input.hasEmploymentHandicap),
    separationWithin12Years: String(input.separationWithin12Years),
  });

  const response = await fetch(`${API_BASE}/vre/eligibility?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Eligibility check failed');
  }

  return response.json() as Promise<VREEligibilityResult>;
}

// ── Analytics API methods ──────────────────────────────────────────────────────

async function updateAnalyticsConsent(consent: { analytics: boolean; sessionId: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/analytics/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(consent),
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Consent update failed');
  }
}

async function getAdminDashboard(from: string, to: string): Promise<UsageAggregates> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${API_BASE}/admin/analytics/dashboard?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Dashboard fetch failed');
  }
  const data = await response.json() as { aggregates: UsageAggregates };
  return data.aggregates;
}

async function generateGrantReport(from: string, to: string): Promise<GrantReport> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`${API_BASE}/admin/analytics/report?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Report generation failed');
  }
  return response.json() as Promise<GrantReport>;
}

async function getImpactMetrics(): Promise<{ aggregates: UsageAggregates; periodStart: string; periodEnd: string }> {
  const response = await fetch(`${API_BASE}/analytics/impact`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, (body as { message?: string }).message ?? 'Impact fetch failed');
  }
  return response.json() as Promise<{ aggregates: UsageAggregates; periodStart: string; periodEnd: string }>;
}

export const apiClient = {
  sendChat,
  reviewDocument,
  reviewDocumentInline,
  uploadDocument,
  searchBenefits,
  getHiddenGems,
  getBenefitById,
  checkEligibility,
  generateDocument,
  listClaims,
  createClaim,
  updateClaim,
  addClaimEvent,
  addDeadlineToClaim,
  toggleChecklistItem,
  deleteClaim,
  shareDocument,
  submitStory,
  listStories,
  upvoteStory,
  reportStory,
  analyzeDecisionLetter,
  listLearningResources,
  getLearningResourceById,
  getFAQ,
  searchFAQ,
  upvoteFAQ,
  getGlossary,
  searchGlossary,
  getGlossaryByLetter,
  getWorkarounds,
  getVREGuide,
  checkVREEligibility,
  updateAnalyticsConsent,
  getAdminDashboard,
  generateGrantReport,
  getImpactMetrics,
} as const;
