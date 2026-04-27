// types.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: All VetAssist TypeScript interfaces — immutable, no business logic

// ─── User Input ───────────────────────────────────────────────────────────────

export interface UserInput {
  readonly sessionId: string;
  readonly userId: string | null;
  readonly text: string;
  readonly timestamp: string;
  readonly source: 'chat' | 'document_upload' | 'community_post';
}

// ─── AI Request / Response ────────────────────────────────────────────────────

export interface AIRequest {
  readonly sessionId: string;
  readonly sanitizedText: string;
  readonly contextChunks: readonly string[];
  readonly skillId: string;
  readonly model: 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001';
  readonly timestamp: string;
}

export interface AIResponse {
  readonly sessionId: string;
  readonly text: string;
  readonly citations: readonly string[];
  readonly confidence: 'high' | 'medium' | 'low';
  readonly model: string;
  readonly timestamp: string;
}

// ─── PII Detection ────────────────────────────────────────────────────────────

export type PIIType = 'SSN' | 'CREDIT_CARD' | 'VA_FILE_NUMBER' | 'DOB' | 'NAME' | 'ADDRESS';
export type PIIDetectionLayer = 'client_regex' | 'server_presidio' | 'ai_preprocessor';
export type PIIAction = 'blocked' | 'redacted' | 'stripped';

export interface PIIDetectionResult {
  readonly hasPII: boolean;
  readonly detectedTypes: readonly PIIType[];
  readonly sanitizedText: string;
  readonly action: PIIAction;
}

// Audit log record — value is NEVER stored here
export interface PIIDetectionEvent {
  readonly eventId: string;
  readonly type: PIIType;
  readonly location: 'text_input' | 'document_upload' | 'community_post' | 'ai_response';
  readonly action: PIIAction;
  readonly timestamp: string;
  readonly detectionLayer: PIIDetectionLayer;
}

// ─── Crisis Detection ─────────────────────────────────────────────────────────

export interface CrisisResult {
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly matchedPhrases: readonly string[];
}

// ─── Legal Boundary ───────────────────────────────────────────────────────────

export type LegalViolationType =
  | 'claim_specific_advice'
  | 'eligibility_statement'
  | 'directive_language'
  | 'outcome_guarantee';

export interface LegalBoundaryResult {
  readonly hasViolation: boolean;
  readonly violationTypes: readonly LegalViolationType[];
  readonly modifiedText: string;
  readonly vsoReferralAppended: boolean;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ComplianceViolationType =
  | 'medical_advice'
  | 'legal_advice'
  | 'guaranteed_outcome'
  | 'exaggeration_language'
  | 'pii_in_response'
  | 'crisis_keywords';

export interface ComplianceCheck {
  readonly type: ComplianceViolationType;
  readonly detected: boolean;
  readonly severity: 'block' | 'modify' | 'warn';
}

export interface ComplianceResult {
  readonly passed: boolean;
  readonly checks: readonly ComplianceCheck[];
  readonly modifiedText: string;
  readonly disclaimerAppended: boolean;
}

// ─── Document Scoring ─────────────────────────────────────────────────────────

export type ScoreCategoryName = 'Specificity' | 'Completeness' | 'VA_Alignment' | 'PII_Safety';

export interface ScoreCategory {
  readonly name: ScoreCategoryName;
  readonly score: number;
  readonly feedback: string;
}

export interface ScoreResult {
  readonly overall: number;
  readonly mode: 'encouraging' | 'strict';
  readonly categories: readonly ScoreCategory[];
  readonly suggestions: readonly DocumentSuggestion[];
}

export interface DocumentSuggestion {
  readonly id: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly text: string;
  readonly cfrCitation: string | null;
}

// ─── Inline Diff Review ───────────────────────────────────────────────────────

// Risk level mirrors document_reviewer.md skill specification
export type DiffRiskLevel = 'safe' | 'moderate' | 'needs_review';

// State of a single diff in the editor — pending until veteran accepts or rejects
export type DiffDecision = 'pending' | 'accepted' | 'rejected';

// A single inline diff suggestion — carries both the original span and the replacement
export interface InlineDiff {
  readonly id: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly riskLevel: DiffRiskLevel;
  readonly category: 'grammar' | 'specificity' | 'completeness' | 'va_alignment' | 'pii';
  // The exact text span in the document to be replaced (null = insertion, no deletion)
  readonly originalText: string | null;
  // The proposed replacement (null = deletion only)
  readonly suggestedText: string | null;
  // Human-readable explanation of WHY this change improves the document
  readonly rationale: string;
  readonly cfrCitation: string | null;
  // Char offset in the source document — used to locate the span for highlight rendering
  readonly startOffset: number;
  readonly endOffset: number;
}

// The full inline review result returned by the API
export interface InlineReviewResult {
  readonly sessionId: string;
  readonly overall: number;
  readonly mode: 'encouraging' | 'strict';
  readonly categories: readonly ScoreCategory[];
  readonly diffs: readonly InlineDiff[];
}

// A single audit trail entry — written when a veteran accepts or rejects a diff
export interface AuditEntry {
  readonly id: string;
  readonly diffId: string;
  readonly decision: 'accepted' | 'rejected';
  readonly originalText: string | null;
  readonly suggestedText: string | null;
  readonly decidedAt: string;
  // Proves the veteran authored the final content — original text preserved for record
  readonly rationale: string;
}

// The completed review state with all decisions recorded
export interface ReviewAuditTrail {
  readonly sessionId: string;
  readonly documentHash: string;
  readonly entries: readonly AuditEntry[];
  readonly completedAt: string;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly pendingCount: number;
}

// ─── Document Generator Wizard ────────────────────────────────────────────────

export type WizardDocType =
  | 'buddy_letter'
  | 'personal_statement'
  | 'stressor_statement'
  | 'nexus_evidence_package';

export type WizardFieldType = 'text' | 'textarea' | 'date' | 'select' | 'boolean';

export interface WizardField {
  readonly id: string;
  readonly label: string;
  readonly type: WizardFieldType;
  readonly placeholder: string;
  readonly helpTooltip: string | null;
  readonly required: boolean;
  readonly options: readonly string[] | null;
}

export interface WizardStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly WizardField[];
}

export type WizardAnswers = Readonly<Record<string, string>>;

export interface GenerateDocumentRequest {
  readonly docType: WizardDocType;
  readonly answers: WizardAnswers;
  readonly scoringMode: 'encouraging' | 'strict';
  readonly sessionId?: string;
}

export interface GeneratedDocument {
  readonly sessionId: string;
  readonly docType: WizardDocType;
  readonly title: string;
  readonly content: string;
  readonly disclaimer: string;
  readonly score: ScoreResult;
  readonly generatedAt: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  readonly id: string;
  readonly ownerId: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly uploadedAt: string;
  readonly expiresAt: string;
  readonly score: ScoreResult | null;
  readonly redacted: boolean;
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

export interface Benefit {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly cfrCitation: string;
  readonly eligibilitySummary: string;
  readonly category: string;
}

// ─── Community ────────────────────────────────────────────────────────────────

export interface CommunityPost {
  readonly id: string;
  readonly authorId: string;
  readonly text: string;
  readonly createdAt: string;
  readonly upvotes: number;
  readonly flagged: boolean;
  readonly moderationStatus: 'pending' | 'approved' | 'removed';
}

// ─── Event Payload Map ────────────────────────────────────────────────────────
// Discriminated union map — all typed events in the system

export interface EventPayloadMap {
  readonly USER_INPUT_RECEIVED: UserInput;
  readonly PII_DETECTED: PIIDetectionEvent;
  readonly INPUT_SANITIZED: { readonly sessionId: string; readonly sanitizedText: string };
  readonly CRISIS_DETECTED: { readonly sessionId: string; readonly result: CrisisResult };
  readonly AI_REQUEST_STARTED: AIRequest;
  readonly AI_RESPONSE_RECEIVED: AIResponse;
  readonly LEGAL_BOUNDARY_TRIGGERED: { readonly sessionId: string; readonly result: LegalBoundaryResult };
  readonly COMPLIANCE_FAILED: { readonly sessionId: string; readonly result: ComplianceResult };
  readonly COMPLIANCE_PASSED: { readonly sessionId: string; readonly finalText: string };
  readonly RESPONSE_READY: { readonly sessionId: string; readonly text: string; readonly citations: readonly string[] };
  readonly DOCUMENT_UPLOADED: { readonly documentId: string; readonly filename: string; readonly mimeType: string };
  readonly OCR_COMPLETED: { readonly documentId: string; readonly charCount: number };
  readonly DOCUMENT_DELETED: { readonly documentId: string; readonly reason: 'user_request' | 'ttl_expired' };
  readonly DOCUMENT_GENERATED: { readonly sessionId: string; readonly docType: string };
}

export type VetAssistEvent = keyof EventPayloadMap;

// ─── Upload ───────────────────────────────────────────────────────────────────

export type UploadStatus = 'uploading' | 'ocr_processing' | 'pii_scanning' | 'ready' | 'error';
export type AcceptedMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'image/tiff'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain';

export interface UploadedDocument {
  readonly id: string;
  readonly originalFilename: string;
  readonly mimeType: AcceptedMimeType;
  readonly status: UploadStatus;
  readonly extractedText: string | null;
  readonly piiRedacted: boolean;
  readonly uploadedAt: string;
  readonly expiresAt: string;
  readonly sizeBytes: number;
  readonly error: string | null;
}

export interface UploadResponse {
  readonly documentId: string;
  readonly status: UploadStatus;
  readonly piiRedacted: boolean;
  readonly message: string;
}

// ─── Benefits (extended) ──────────────────────────────────────────────────────

export type BenefitCategory =
  | 'healthcare'
  | 'education'
  | 'housing'
  | 'employment'
  | 'compensation'
  | 'pension'
  | 'insurance'
  | 'burial'
  | 'family'
  | 'transition';

export type BenefitSource = 'official_va' | 'vso_verified' | 'community';

export interface BenefitV2 {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly category: BenefitCategory;
  readonly source: BenefitSource;
  readonly eligibilityRules: readonly string[];
  readonly applicationSteps: readonly string[];
  readonly cfr: string | null;
  readonly officialUrl: string;
  readonly stateCode: string | null;
  readonly isHiddenGem: boolean;
  readonly tags: readonly string[];
}

export interface EligibilityQuestion {
  readonly id: string;
  readonly text: string;
  readonly type: 'boolean' | 'select' | 'number';
  readonly options: readonly string[] | null;
}

export interface EligibilityAnswers {
  readonly veteranStatus: 'active' | 'veteran' | 'guard_reserve' | 'survivor';
  readonly dischargeType:
    | 'honorable'
    | 'general'
    | 'other_than_honorable'
    | 'bad_conduct'
    | 'dishonorable'
    | 'unknown';
  readonly serviceYears: number;
  readonly disabilityRating: number;
  readonly stateCode: string | null;
  readonly hasServiceConnectedCondition: boolean;
}

export interface EligibilityResult {
  readonly benefits: readonly BenefitV2[];
  readonly totalMatched: number;
}

// ─── Skill System ─────────────────────────────────────────────────────────────

export type SkillId =
  | 'va_expert'
  | 'document_reviewer'
  | 'document_writer'
  | 'decision_letter'
  | 'story_builder'
  | 'compliance_guard'
  | 'pii_guard';

// ─── Decision Letter Analysis ─────────────────────────────────────────────────

export type ConditionDecisionOutcome = 'granted' | 'denied' | 'deferred';

export interface ConditionDecision {
  readonly condition: string;
  readonly decision: ConditionDecisionOutcome;
  readonly ratingPercent: number | null;
  readonly effectiveDate: string | null;
  readonly reasoningPlainEnglish: string;
  readonly evidenceCited: readonly string[];
  readonly evidenceMissing: readonly string[];
}

export interface EvidenceAnalysis {
  readonly cited: readonly string[];
  readonly missing: readonly string[];
  readonly recommendations: readonly string[];
}

export interface AppealOption {
  readonly name: string;
  readonly deadline: string;
  readonly description: string;
  readonly cfrCitation: string;
}

export interface RatingCalculation {
  readonly conditions: readonly { readonly name: string; readonly percent: number }[];
  readonly combinedPercent: number;
  readonly calculationSteps: string;
}

export interface DecisionLetterAnalysis {
  readonly sessionId: string;
  readonly summary: string;
  readonly conditions: readonly ConditionDecision[];
  readonly evidenceAnalysis: EvidenceAnalysis;
  readonly appealOptions: readonly AppealOption[];
  readonly combinedRating: RatingCalculation;
}

// ─── Community Stories ────────────────────────────────────────────────────────

export type StoryCategory = 'cp_exam' | 'evidence' | 'appeals' | 'benefits_discovery' | 'transition' | 'general';
export type StoryBranch = 'army' | 'navy' | 'marines' | 'air_force' | 'coast_guard' | 'space_force' | 'national_guard' | 'reserves';
export type StoryStatus = 'pending' | 'approved' | 'removed';
export type StoryAuthorMode = 'anonymous' | 'username' | 'verified';

export interface StoryTip {
  readonly id: string;
  readonly text: string;
  readonly cfrCitation: string | null;
  readonly category: StoryCategory;
}

export interface CommunityStory {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly category: StoryCategory;
  readonly branch: StoryBranch | null;
  readonly tags: readonly string[];
  readonly authorMode: StoryAuthorMode;
  readonly authorDisplay: string;
  readonly status: StoryStatus;
  readonly upvotes: number;
  readonly tips: readonly StoryTip[];
  readonly disclaimer: string;
  readonly submittedAt: string;
  readonly approvedAt: string | null;
}

export interface SubmitStoryRequest {
  readonly title: string;
  readonly content: string;
  readonly category: StoryCategory;
  readonly branch: StoryBranch | null;
  readonly tags: readonly string[];
  readonly authorMode: StoryAuthorMode;
  readonly authorDisplay: string;
  readonly sessionId?: string;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export type ModerationFlag = 'toxic' | 'pii' | 'spam' | 'community_report';
export type ModerationAction = 'approved' | 'flagged' | 'removed';

export interface ModerationResult {
  readonly action: ModerationAction;
  readonly flags: readonly ModerationFlag[];
  readonly toxicityScore: number;
  readonly requiresAdminReview: boolean;
  readonly reason: string;
}

export interface ModQueueEntry {
  readonly id: string;
  readonly storyId: string;
  readonly storyTitle: string;
  readonly flags: readonly ModerationFlag[];
  readonly toxicityScore: number;
  readonly reportCount: number;
  readonly queuedAt: string;
}

// ─── Document Sharing ─────────────────────────────────────────────────────────

// Direct-share channels only — no temporary URLs or cloud-hosted share pages
export type ShareChannel = 'email' | 'sms' | 'download';

export interface ShareRequest {
  readonly documentContent: string;
  readonly documentTitle: string;
  readonly channel: ShareChannel;
  // Required for email/SMS; absent for download
  readonly recipient: string | null;
  readonly sessionId: string;
}

export interface ShareResult {
  readonly success: boolean;
  readonly channel: ShareChannel;
  readonly piiRescanned: boolean;
  readonly piiFound: boolean;
  // download: base64-encoded .txt content for client to trigger browser save
  readonly downloadPayload: string | null;
  readonly message: string;
  readonly sharedAt: string;
}

// ─── Learning Hub ─────────────────────────────────────────────────────────────

export type LearningResourceType = 'video' | 'article' | 'guide' | 'tool';

export type LearningResourceTopic =
  | 'disability_compensation'
  | 'appeals'
  | 'healthcare'
  | 'education'
  | 'housing'
  | 'employment'
  | 'transition'
  | 'general';

export type LearningDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningResource {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: LearningResourceType;
  readonly topic: LearningResourceTopic;
  readonly difficultyLevel: LearningDifficultyLevel;
  // AI-extracted key takeaways — generated at seed time, not per-request
  readonly keyTakeaways: readonly string[];
  readonly sourceUrl: string;
  readonly sourceName: string;
  // Admin-verified content gets the verified badge
  readonly isVerified: boolean;
  readonly addedAt: string;
}

export interface LearningHubResponse {
  readonly resources: readonly LearningResource[];
  readonly totalCount: number;
}

// ─── Request Classifier ───────────────────────────────────────────────────────

export type RequestType = 'chat' | 'document_review' | 'decision_letter' | 'document_write' | 'story_build';

export interface ClassifiedRequest {
  readonly type: RequestType;
  readonly confidence: number;
  readonly skillId: SkillId;
}
