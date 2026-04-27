// ClaimsStore.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: In-memory claims store — create, read, update, add events/deadlines/checklist items

import type {
  Claim,
  ClaimEvent,
  ClaimDeadline,
  ChecklistItem,
  CreateClaimRequest,
  UpdateClaimRequest,
  AddEventRequest,
  AddDeadlineRequest,
  ToggleChecklistRequest,
} from '@vetassist/shared-types';

// Default alert window in days — how far ahead to warn before a deadline
const DEFAULT_ALERT_DAYS_BEFORE = 7;

// Default checklist items seeded on every new claim — covers the core evidence gathering tasks
const DEFAULT_CHECKLIST: readonly ChecklistItem[] = [
  { id: 'buddy-letter',      label: 'Obtain buddy letters from witnesses',             completed: false, category: 'evidence' },
  { id: 'nexus-letter',      label: 'Request nexus letter from treating physician',    completed: false, category: 'nexus'    },
  { id: 'service-records',   label: 'Obtain relevant service treatment records',       completed: false, category: 'evidence' },
  { id: 'personal-statement',label: 'Write personal statement (VA Form 21-4138)',      completed: false, category: 'forms'    },
  { id: 'buddy-letter-2',    label: 'Submit on eBenefits or VA.gov',                  completed: false, category: 'forms'    },
];

// Generates a simple UUID v4-compatible string — no external deps for MVP
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ClaimsStore {
  // Internal map is private — no external mutation allowed
  private readonly store: Map<string, Claim> = new Map();

  // Creates a new claim, seeds the default checklist, and emits a creation event in the timeline
  createClaim(req: CreateClaimRequest): Claim {
    const id = generateId();
    const now = new Date().toISOString();

    // Seed a 'claim_created' event in the timeline so progress is auditable from day one
    const createdEvent: ClaimEvent = {
      id:          generateId(),
      type:        'claim_created',
      title:       'Claim Started',
      description: `Claim for "${req.condition}" created.`,
      occurredAt:  now,
    };

    const claim: Claim = {
      id,
      condition:       req.condition,
      status:          'not_started',
      disabilityRating: null,
      submittedAt:     null,
      createdAt:       now,
      updatedAt:       now,
      timeline:        [createdEvent],
      deadlines:       [],
      checklist:       [...DEFAULT_CHECKLIST],
      notes:           req.notes ?? '',
    };

    this.store.set(id, claim);
    return claim;
  }

  // Returns null when the claim id is unknown — callers handle 404 themselves
  getClaim(id: string): Claim | null {
    return this.store.get(id) ?? null;
  }

  // Returns all claims as an immutable snapshot
  listClaims(): readonly Claim[] {
    return Array.from(this.store.values());
  }

  // Merges only the provided fields — partial update pattern keeps callers minimal
  updateClaim(id: string, req: UpdateClaimRequest): Claim | null {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: Claim = {
      ...existing,
      ...(req.status !== undefined          ? { status: req.status }                   : {}),
      ...(req.disabilityRating !== undefined ? { disabilityRating: req.disabilityRating } : {}),
      ...(req.notes !== undefined            ? { notes: req.notes }                    : {}),
      // Auto-set submittedAt on first transition to submitted
      ...(req.status === 'submitted' && !existing.submittedAt ? { submittedAt: new Date().toISOString() } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.store.set(id, updated);
    return updated;
  }

  // Appends a new timeline event — occurredAt defaults to now when not provided
  addEvent(claimId: string, req: AddEventRequest): Claim | null {
    const existing = this.store.get(claimId);
    if (!existing) return null;

    const event: ClaimEvent = {
      id:          generateId(),
      type:        req.type,
      title:       req.title,
      description: req.description,
      occurredAt:  req.occurredAt ?? new Date().toISOString(),
    };

    const updated: Claim = {
      ...existing,
      timeline:  [...existing.timeline, event],
      updatedAt: new Date().toISOString(),
    };

    this.store.set(claimId, updated);
    return updated;
  }

  // Appends a deadline — alertDaysBefore defaults to 7 if omitted
  addDeadline(claimId: string, req: AddDeadlineRequest): Claim | null {
    const existing = this.store.get(claimId);
    if (!existing) return null;

    const deadline: ClaimDeadline = {
      id:               generateId(),
      type:             req.type,
      label:            req.label,
      dueAt:            req.dueAt,
      alertDaysBefore:  req.alertDaysBefore ?? DEFAULT_ALERT_DAYS_BEFORE,
    };

    const updated: Claim = {
      ...existing,
      deadlines: [...existing.deadlines, deadline],
      updatedAt: new Date().toISOString(),
    };

    this.store.set(claimId, updated);
    return updated;
  }

  // Toggles a single checklist item — no-op if the itemId doesn't exist
  toggleChecklistItem(claimId: string, req: ToggleChecklistRequest): Claim | null {
    const existing = this.store.get(claimId);
    if (!existing) return null;

    const updatedChecklist = existing.checklist.map((item) =>
      item.id === req.itemId ? { ...item, completed: req.completed } : item,
    );

    const updated: Claim = {
      ...existing,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    };

    this.store.set(claimId, updated);
    return updated;
  }

  // Hard-deletes a claim — returns false when id is unknown
  deleteClaim(id: string): boolean {
    return this.store.delete(id);
  }
}
