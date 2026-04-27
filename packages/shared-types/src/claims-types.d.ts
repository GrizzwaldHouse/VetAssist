export type ClaimStatus = 'not_started' | 'gathering_evidence' | 'submitted' | 'pending_decision' | 'rating_received' | 'closed';
export type ClaimEventType = 'claim_created' | 'evidence_added' | 'submitted_to_va' | 'c_and_p_exam_scheduled' | 'c_and_p_exam_completed' | 'decision_received' | 'appeal_filed' | 'note_added';
export type DeadlineType = 'itf_expiration' | 'c_and_p_exam' | 'appeal_deadline' | 'custom';
export interface ClaimEvent {
    readonly id: string;
    readonly type: ClaimEventType;
    readonly title: string;
    readonly description: string;
    readonly occurredAt: string;
}
export interface ClaimDeadline {
    readonly id: string;
    readonly type: DeadlineType;
    readonly label: string;
    readonly dueAt: string;
    readonly alertDaysBefore: number;
}
export interface ChecklistItem {
    readonly id: string;
    readonly label: string;
    readonly completed: boolean;
    readonly category: 'evidence' | 'forms' | 'appointments' | 'nexus';
}
export interface Claim {
    readonly id: string;
    readonly condition: string;
    readonly status: ClaimStatus;
    readonly disabilityRating: number | null;
    readonly submittedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly timeline: readonly ClaimEvent[];
    readonly deadlines: readonly ClaimDeadline[];
    readonly checklist: readonly ChecklistItem[];
    readonly notes: string;
}
export interface CreateClaimRequest {
    readonly condition: string;
    readonly notes?: string;
}
export interface UpdateClaimRequest {
    readonly status?: ClaimStatus;
    readonly disabilityRating?: number | null;
    readonly notes?: string;
}
export interface AddEventRequest {
    readonly type: ClaimEventType;
    readonly title: string;
    readonly description: string;
    readonly occurredAt?: string;
}
export interface AddDeadlineRequest {
    readonly type: DeadlineType;
    readonly label: string;
    readonly dueAt: string;
    readonly alertDaysBefore?: number;
}
export interface ToggleChecklistRequest {
    readonly itemId: string;
    readonly completed: boolean;
}
//# sourceMappingURL=claims-types.d.ts.map