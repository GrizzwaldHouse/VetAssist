// index.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Public exports for @vetassist/shared-types package

export type {
  // User input
  UserInput,
  // AI request / response
  AIRequest,
  AIResponse,
  // PII detection
  PIIType,
  PIIDetectionLayer,
  PIIAction,
  PIIDetectionResult,
  PIIDetectionEvent,
  // Crisis detection
  CrisisResult,
  // Legal boundary
  LegalViolationType,
  LegalBoundaryResult,
  // Compliance
  ComplianceViolationType,
  ComplianceResult,
  ComplianceCheck,
  ComplianceStateRule,
  // Document scoring
  ScoreCategoryName,
  ScoreCategory,
  ScoreResult,
  DocumentSuggestion,
  // Inline diff review
  DiffRiskLevel,
  DiffDecision,
  InlineDiff,
  InlineReviewResult,
  AuditEntry,
  ReviewAuditTrail,
  // Domain models
  Document,
  Benefit,
  CommunityPost,
  // Events
  EventPayloadMap,
  VetAssistEvent,
  // Skill system
  SkillId,
  // Decision letter analysis
  ConditionDecisionOutcome,
  ConditionDecision,
  EvidenceAnalysis,
  AppealOption,
  RatingCalculation,
  DecisionLetterAnalysis,
  // Community stories
  StoryCategory,
  StoryBranch,
  StoryStatus,
  StoryAuthorMode,
  StoryTip,
  CommunityStory,
  SubmitStoryRequest,
  // Moderation
  ModerationFlag,
  ModerationAction,
  ModerationResult,
  ModQueueEntry,
  // Document sharing
  ShareChannel,
  ShareRequest,
  ShareResult,
  // Accredited boundary
  UserRole,
  AccreditationStatus,
  Accreditation,
  UserContext,
  RouteRiskLevel,
  RoutePolicy,
  AccessRequestContext,
  AccessDecision,
  ComplianceAuditLog,
  StateRestrictionConfig,
  // Request classifier
  RequestType,
  ClassifiedRequest,
  // Upload
  UploadStatus,
  AcceptedMimeType,
  UploadedDocument,
  UploadResponse,
  // Benefits (extended)
  BenefitCategory,
  BenefitSource,
  BenefitV2,
  EligibilityQuestion,
  EligibilityAnswers,
  EligibilityResult,
  // Wizard / document generator
  WizardDocType,
  WizardFieldType,
  WizardField,
  WizardStep,
  WizardAnswers,
  GenerateDocumentRequest,
  GeneratedDocument,
  // Learning Hub
  LearningResourceType,
  LearningResourceTopic,
  LearningDifficultyLevel,
  LearningResource,
  LearningHubResponse,
  // Data destruction
  DeletionStep,
  DeletionProgress,
  WipeMethod,
  DeletionCertificate,
  DataDestructionResult,
  // Offline
  OfflineStatus,
  DocumentDraft,
  // Analytics
  AnalyticsEvent,
  AnalyticsConsent,
  UsageAggregates,
  GrantReport,
} from './types.js';

export type {
  // Claims Tracker
  ClaimStatus,
  ClaimEventType,
  DeadlineType,
  ClaimEvent,
  ClaimDeadline,
  ChecklistItem,
  Claim,
  CreateClaimRequest,
  UpdateClaimRequest,
  AddEventRequest,
  AddDeadlineRequest,
  ToggleChecklistRequest,
} from './claims-types.js';

export type {
  // FAQ & Glossary
  FAQCategory,
  FAQEntry,
  GlossaryTerm,
  VAWorkaround,
  FAQListResponse,
  GlossaryListResponse,
} from './faq-glossary-types.js';

export type {
  // VR&E Chapter 31 Guide
  VREDischargeType,
  VREEligibilityInput,
  VREEligibilityStatus,
  VREEligibilityResult,
  VRETrackId,
  VRETrackProCon,
  VRETrack,
  VREComparisonRow,
  VREComparison,
  VREApplicationStep,
  VREGuideResponse,
} from './vre-types.js';
