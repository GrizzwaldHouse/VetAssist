export interface UserInput {
    readonly sessionId: string;
    readonly userId: string | null;
    readonly text: string;
    readonly timestamp: string;
    readonly source: 'chat' | 'document_upload' | 'community_post';
}
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
export type PIIType = 'SSN' | 'CREDIT_CARD' | 'VA_FILE_NUMBER' | 'DOB' | 'NAME' | 'ADDRESS';
export type PIIDetectionLayer = 'client_regex' | 'server_presidio' | 'ai_preprocessor';
export type PIIAction = 'blocked' | 'redacted' | 'stripped';
export interface PIIDetectionResult {
    readonly hasPII: boolean;
    readonly detectedTypes: readonly PIIType[];
    readonly sanitizedText: string;
    readonly action: PIIAction;
}
export interface PIIDetectionEvent {
    readonly eventId: string;
    readonly type: PIIType;
    readonly location: 'text_input' | 'document_upload' | 'community_post' | 'ai_response';
    readonly action: PIIAction;
    readonly timestamp: string;
    readonly detectionLayer: PIIDetectionLayer;
}
export interface CrisisResult {
    readonly isCrisis: boolean;
    readonly confidence: number;
    readonly matchedPhrases: readonly string[];
}
export type LegalViolationType = 'claim_specific_advice' | 'eligibility_statement' | 'directive_language' | 'outcome_guarantee';
export interface LegalBoundaryResult {
    readonly hasViolation: boolean;
    readonly violationTypes: readonly LegalViolationType[];
    readonly modifiedText: string;
    readonly vsoReferralAppended: boolean;
}
export type ComplianceViolationType = 'medical_advice' | 'legal_advice' | 'guaranteed_outcome' | 'exaggeration_language' | 'pii_in_response' | 'crisis_keywords';
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
export type DiffRiskLevel = 'safe' | 'moderate' | 'needs_review';
export type DiffDecision = 'pending' | 'accepted' | 'rejected';
export interface InlineDiff {
    readonly id: string;
    readonly priority: 'high' | 'medium' | 'low';
    readonly riskLevel: DiffRiskLevel;
    readonly category: 'grammar' | 'specificity' | 'completeness' | 'va_alignment' | 'pii';
    readonly originalText: string | null;
    readonly suggestedText: string | null;
    readonly rationale: string;
    readonly cfrCitation: string | null;
    readonly startOffset: number;
    readonly endOffset: number;
}
export interface InlineReviewResult {
    readonly sessionId: string;
    readonly overall: number;
    readonly mode: 'encouraging' | 'strict';
    readonly categories: readonly ScoreCategory[];
    readonly diffs: readonly InlineDiff[];
}
export interface AuditEntry {
    readonly id: string;
    readonly diffId: string;
    readonly decision: 'accepted' | 'rejected';
    readonly originalText: string | null;
    readonly suggestedText: string | null;
    readonly decidedAt: string;
    readonly rationale: string;
}
export interface ReviewAuditTrail {
    readonly sessionId: string;
    readonly documentHash: string;
    readonly entries: readonly AuditEntry[];
    readonly completedAt: string;
    readonly acceptedCount: number;
    readonly rejectedCount: number;
    readonly pendingCount: number;
}
export type WizardDocType = 'buddy_letter' | 'personal_statement' | 'stressor_statement' | 'nexus_evidence_package';
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
export interface Benefit {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly cfrCitation: string;
    readonly eligibilitySummary: string;
    readonly category: string;
}
export interface CommunityPost {
    readonly id: string;
    readonly authorId: string;
    readonly text: string;
    readonly createdAt: string;
    readonly upvotes: number;
    readonly flagged: boolean;
    readonly moderationStatus: 'pending' | 'approved' | 'removed';
}
export interface EventPayloadMap {
    readonly USER_INPUT_RECEIVED: UserInput;
    readonly PII_DETECTED: PIIDetectionEvent;
    readonly INPUT_SANITIZED: {
        readonly sessionId: string;
        readonly sanitizedText: string;
    };
    readonly CRISIS_DETECTED: {
        readonly sessionId: string;
        readonly result: CrisisResult;
    };
    readonly AI_REQUEST_STARTED: AIRequest;
    readonly AI_RESPONSE_RECEIVED: AIResponse;
    readonly LEGAL_BOUNDARY_TRIGGERED: {
        readonly sessionId: string;
        readonly result: LegalBoundaryResult;
    };
    readonly COMPLIANCE_FAILED: {
        readonly sessionId: string;
        readonly result: ComplianceResult;
    };
    readonly COMPLIANCE_PASSED: {
        readonly sessionId: string;
        readonly finalText: string;
    };
    readonly RESPONSE_READY: {
        readonly sessionId: string;
        readonly text: string;
        readonly citations: readonly string[];
    };
    readonly DOCUMENT_UPLOADED: {
        readonly documentId: string;
        readonly filename: string;
        readonly mimeType: string;
    };
    readonly OCR_COMPLETED: {
        readonly documentId: string;
        readonly charCount: number;
    };
    readonly DOCUMENT_DELETED: {
        readonly documentId: string;
        readonly reason: 'user_request' | 'ttl_expired';
    };
    readonly DOCUMENT_GENERATED: {
        readonly sessionId: string;
        readonly docType: string;
    };
}
export type VetAssistEvent = keyof EventPayloadMap;
export type UploadStatus = 'uploading' | 'ocr_processing' | 'pii_scanning' | 'ready' | 'error';
export type AcceptedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic' | 'image/tiff' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'text/plain';
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
export type BenefitCategory = 'healthcare' | 'education' | 'housing' | 'employment' | 'compensation' | 'pension' | 'insurance' | 'burial' | 'family' | 'transition';
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
    readonly dischargeType: 'honorable' | 'general' | 'other_than_honorable' | 'bad_conduct' | 'dishonorable' | 'unknown';
    readonly serviceYears: number;
    readonly disabilityRating: number;
    readonly stateCode: string | null;
    readonly hasServiceConnectedCondition: boolean;
}
export interface EligibilityResult {
    readonly benefits: readonly BenefitV2[];
    readonly totalMatched: number;
}
export type SkillId = 'va_expert' | 'document_reviewer' | 'document_writer' | 'decision_letter' | 'story_builder' | 'compliance_guard' | 'pii_guard';
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
    readonly conditions: readonly {
        readonly name: string;
        readonly percent: number;
    }[];
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
export type RequestType = 'chat' | 'document_review' | 'decision_letter' | 'document_write' | 'story_build';
export interface ClassifiedRequest {
    readonly type: RequestType;
    readonly confidence: number;
    readonly skillId: SkillId;
}
//# sourceMappingURL=types.d.ts.map