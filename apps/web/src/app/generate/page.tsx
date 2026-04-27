// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Document generator wizard — multi-step guided form for creating VA documents

'use client';

import React, { useState, useCallback } from 'react';
import { AIDisclosureBanner, CrisisLineBanner, ScoreRing } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { GeneratedDocument, WizardDocType } from '../../lib/apiClient.js';

// ── Wizard step definitions ────────────────────────────────────────────────────
// Defined inline — avoids cross-package dep for UI-only wizard metadata

interface WizardFieldDef {
  readonly id: string;
  readonly label: string;
  readonly type: 'text' | 'textarea' | 'date' | 'select' | 'boolean';
  readonly placeholder: string;
  readonly helpTooltip: string | null;
  readonly required: boolean;
  readonly options: readonly string[] | null;
}

interface WizardStepDef {
  readonly stepNumber: number;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly WizardFieldDef[];
}

const WIZARD_STEP_DEFINITIONS: Readonly<Record<WizardDocType, readonly WizardStepDef[]>> = {
  buddy_letter: [
    {
      stepNumber: 1,
      title: 'About You',
      description: 'Tell us about your relationship with the veteran.',
      fields: [
        { id: 'writer_name', label: 'Your Full Name', type: 'text', placeholder: 'John Smith', helpTooltip: null, required: true, options: null },
        { id: 'writer_relationship', label: 'Your Relationship to the Veteran', type: 'select', placeholder: '', helpTooltip: null, required: true, options: ['Spouse', 'Parent', 'Sibling', 'Friend', 'Coworker', 'Fellow Veteran', 'Other'] },
        { id: 'met_date', label: 'When Did You Meet?', type: 'date', placeholder: '', helpTooltip: null, required: true, options: null },
        { id: 'met_location', label: 'Where Did You Meet?', type: 'text', placeholder: 'City, state, or duty station', helpTooltip: null, required: true, options: null },
      ],
    },
    {
      stepNumber: 2,
      title: 'What You Observed',
      description: 'Describe specific behaviors and their impact.',
      fields: [
        { id: 'observed_behaviors', label: 'Observed Behaviors', type: 'textarea', placeholder: 'Describe specific behaviors, incidents, or changes you personally witnessed. Include dates and details.', helpTooltip: 'Include specific dates, locations, and what you personally saw or heard.', required: true, options: null },
        { id: 'frequency', label: 'Frequency of Observations', type: 'textarea', placeholder: 'How often did you observe these behaviors?', helpTooltip: null, required: true, options: null },
        { id: 'impact_daily_life', label: 'Impact on Daily Life', type: 'textarea', placeholder: "How have these behaviors affected the veteran's daily life, work, or relationships?", helpTooltip: null, required: true, options: null },
      ],
    },
    {
      stepNumber: 3,
      title: 'Perjury Affirmation',
      description: 'Confirm the truthfulness of your statement.',
      fields: [
        { id: 'declaration_true', label: 'I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge and belief.', type: 'boolean', placeholder: '', helpTooltip: 'This affirmation is required for the letter to be accepted by the VA.', required: true, options: null },
      ],
    },
  ],
  personal_statement: [
    {
      stepNumber: 1,
      title: 'Your Condition',
      description: 'Tell us about the condition you are claiming.',
      fields: [
        { id: 'condition_claimed', label: 'Condition Being Claimed', type: 'text', placeholder: 'e.g., PTSD, chronic back pain, hearing loss', helpTooltip: null, required: true, options: null },
        { id: 'condition_start_date', label: 'When Did This Condition Start?', type: 'date', placeholder: '', helpTooltip: null, required: true, options: null },
        { id: 'condition_origin', label: 'How This Condition Started', type: 'textarea', placeholder: 'How and when did this condition start? Include service connection if applicable.', helpTooltip: 'Be as specific as possible — dates, events, duty stations.', required: true, options: null },
      ],
    },
    {
      stepNumber: 2,
      title: 'Current Impact',
      description: 'Describe how this condition affects you today.',
      fields: [
        { id: 'current_symptoms', label: 'Current Symptoms', type: 'textarea', placeholder: 'Describe your current symptoms — frequency, severity (1-10), and duration of episodes.', helpTooltip: 'Include how often symptoms occur and how severe they are.', required: true, options: null },
        { id: 'work_impact', label: 'Impact on Work', type: 'textarea', placeholder: 'How does this condition affect your ability to work?', helpTooltip: null, required: true, options: null },
        { id: 'daily_life_impact', label: 'Impact on Daily Life', type: 'textarea', placeholder: 'How does this condition affect daily activities, relationships, and quality of life?', helpTooltip: null, required: true, options: null },
        { id: 'worst_day', label: 'Your Worst Day', type: 'textarea', placeholder: 'Describe your worst day with this condition.', helpTooltip: 'This helps the VA understand the full impact.', required: false, options: null },
      ],
    },
    {
      stepNumber: 3,
      title: 'Treatment History',
      description: 'Tell us about the treatments you have received.',
      fields: [
        { id: 'treatments_tried', label: 'Treatments Tried', type: 'textarea', placeholder: 'List treatments, medications, and therapy you have tried.', helpTooltip: null, required: true, options: null },
        { id: 'current_treatment', label: 'Current Treatment Plan', type: 'textarea', placeholder: 'What is your current treatment plan?', helpTooltip: null, required: false, options: null },
      ],
    },
  ],
  stressor_statement: [
    {
      stepNumber: 1,
      title: 'The Event',
      description: 'Describe what happened as specifically as possible.',
      fields: [
        { id: 'event_description', label: 'What Happened', type: 'textarea', placeholder: 'Describe what happened. Be as specific as possible — what you saw, heard, or experienced.', helpTooltip: 'Include sensory details — what you saw, heard, smelled, or felt.', required: true, options: null },
        { id: 'event_date', label: 'When Did This Happen?', type: 'text', placeholder: 'Approximate date or timeframe', helpTooltip: 'An approximate date is fine if you cannot recall exactly.', required: true, options: null },
        { id: 'event_location', label: 'Where Did This Happen?', type: 'text', placeholder: 'Duty station, city, country, or unit', helpTooltip: null, required: true, options: null },
        { id: 'unit_assignment', label: 'Your Unit at the Time', type: 'text', placeholder: 'Your unit/ship/squadron at the time', helpTooltip: null, required: true, options: null },
      ],
    },
    {
      stepNumber: 2,
      title: 'Witnesses & Records',
      description: 'Note any witnesses or supporting records.',
      fields: [
        { id: 'witnesses', label: 'Witnesses (if known)', type: 'textarea', placeholder: 'Names of anyone who was present, if known. Leave blank if unknown.', helpTooltip: 'Even partial names or descriptions are helpful.', required: false, options: null },
        { id: 'supporting_records', label: 'Supporting Records', type: 'textarea', placeholder: 'Any records, documents, or buddy letters that may support this statement.', helpTooltip: null, required: false, options: null },
      ],
    },
    {
      stepNumber: 3,
      title: 'Then and Now',
      description: 'Describe the impact of this event at the time and today.',
      fields: [
        { id: 'immediate_impact', label: 'How It Affected You At the Time', type: 'textarea', placeholder: 'How did this event affect you at the time?', helpTooltip: null, required: true, options: null },
        { id: 'current_impact', label: 'How It Affects You Today', type: 'textarea', placeholder: 'How does this event affect you today?', helpTooltip: null, required: true, options: null },
      ],
    },
  ],
  nexus_evidence_package: [
    {
      stepNumber: 1,
      title: 'Service Connection',
      description: 'Describe the connection between your conditions.',
      fields: [
        { id: 'service_connected_condition', label: 'Existing Service-Connected Condition', type: 'text', placeholder: 'Your existing service-connected condition', helpTooltip: null, required: true, options: null },
        { id: 'secondary_condition', label: 'Secondary Condition Being Claimed', type: 'text', placeholder: 'The secondary condition you are claiming', helpTooltip: null, required: true, options: null },
        { id: 'symptom_timeline', label: 'Symptom Timeline', type: 'textarea', placeholder: 'Describe the timeline — when the secondary condition began in relation to the primary condition.', helpTooltip: 'Include dates and how the conditions are related.', required: true, options: null },
      ],
    },
    {
      stepNumber: 2,
      title: 'Medical History',
      description: 'Provide relevant medical history for both conditions.',
      fields: [
        { id: 'service_records_summary', label: 'Service Medical Records Summary', type: 'textarea', placeholder: 'Summarize relevant service medical records', helpTooltip: null, required: true, options: null },
        { id: 'current_medications', label: 'Current Medications', type: 'textarea', placeholder: 'Current medications for both conditions', helpTooltip: null, required: false, options: null },
        { id: 'treating_physician', label: 'Treating Physician', type: 'text', placeholder: 'Name and specialty of your treating physician', helpTooltip: null, required: false, options: null },
      ],
    },
    {
      stepNumber: 3,
      title: 'Evidence Package',
      description: 'Additional context for your doctor when drafting the nexus letter.',
      fields: [
        { id: 'medical_literature', label: 'Medical Literature (optional)', type: 'textarea', placeholder: 'List any medical research or nexus theories your doctor has discussed (optional — your doctor can add these)', helpTooltip: null, required: false, options: null },
        { id: 'additional_notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional context for your doctor when drafting the nexus letter.', helpTooltip: null, required: false, options: null },
      ],
    },
  ],
} as const;

// ── Display constants ──────────────────────────────────────────────────────────

const PAGE_HEADING = 'Document Generator';
const PAGE_SUBHEADING = 'Generate a VA document in minutes — guided step-by-step';

const DOC_TYPE_LABELS: Readonly<Record<WizardDocType, string>> = {
  buddy_letter: 'Buddy Letter',
  personal_statement: 'Personal Statement',
  stressor_statement: 'Stressor Statement',
  nexus_evidence_package: 'Nexus Evidence Package',
} as const;

const DOC_TYPE_DESCRIPTIONS: Readonly<Record<WizardDocType, string>> = {
  buddy_letter: 'A lay statement from someone who knows you — describing what they personally observed about your condition.',
  personal_statement: 'Your own account of your condition — how it started, how it affects you today, and what treatment you have received.',
  stressor_statement: 'A factual narrative of a specific event or stressor that contributed to your condition.',
  nexus_evidence_package: 'An evidence package for your doctor to use when writing a nexus letter connecting your primary and secondary conditions.',
} as const;

const DOC_TYPE_ICONS: Readonly<Record<WizardDocType, string>> = {
  buddy_letter: '✉',
  personal_statement: '✍',
  stressor_statement: '◈',
  nexus_evidence_package: '⊕',
} as const;

// Download filename prefix — no magic strings
const DOWNLOAD_FILENAME_PREFIX = 'vetassist';

// Wizard flow step numbers — controls which view is active
const FLOW_STEP_TYPE_SELECT = 0;
const FLOW_STEP_WIZARD_BASE = 1;
const FLOW_STEP_PREVIEW = 4;
const FLOW_STEP_DOWNLOAD = 5;

// Score display label
const SCORE_LABEL = 'Quality Score';

// Button labels
const LABEL_BACK = 'Back';
const LABEL_NEXT = 'Next';
const LABEL_GENERATE = 'Generate Document';
const LABEL_GENERATING = 'Generating…';
const LABEL_DOWNLOAD = 'Download .txt';
const LABEL_START_OVER = 'Start Over';

// Disclaimer shown on the preview screen
const DISCLAIMER_NOTICE =
  'This document was generated with AI writing assistance. Review it carefully and consult a VSO before submitting.';

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '800px',
  margin: '0 auto',
  padding: '24px var(--va-space-6)',
  gap: '24px',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: 0,
};

const typeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const typeCardStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '20px',
  borderRadius: 'var(--va-radius-card)',
  border: `2px solid ${selected ? 'var(--va-color-old-glory-blue, #1a2744)' : 'var(--va-color-border)'}`,
  backgroundColor: selected ? 'var(--va-color-old-glory-blue, #1a2744)' : 'var(--va-color-aged-canvas)',
  color: selected ? 'var(--va-color-star-white)' : 'var(--va-color-text-primary)',
  cursor: 'pointer',
  transition: 'border-color 0.15s, background-color 0.15s',
});

const typeIconStyle: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: 1,
};

const typeLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
};

const typeDescStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  lineHeight: 1.4,
  opacity: 0.85,
};

const stepIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const stepCircleStyle = (active: boolean, completed: boolean): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 700,
  flexShrink: 0,
  backgroundColor: completed
    ? 'var(--va-color-score-high)'
    : active
    ? 'var(--va-color-old-glory-red)'
    : 'var(--va-color-border)',
  color: completed || active ? '#fff' : 'var(--va-color-text-secondary)',
});

const stepConnectorStyle: React.CSSProperties = {
  flex: 1,
  height: '2px',
  backgroundColor: 'var(--va-color-border)',
};

const stepTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const stepDescStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  margin: 0,
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-primary)',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  boxSizing: 'border-box',
};

const textareaFieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '120px',
  padding: '12px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  resize: 'vertical',
  lineHeight: 1.6,
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

const tooltipStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px',
};

const primaryButtonStyle: React.CSSProperties = {
  height: '48px',
  padding: '0 28px',
  borderRadius: 'var(--va-radius-card)',
  border: 'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: '#fff',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const primaryButtonDisabledStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
};

const secondaryButtonStyle: React.CSSProperties = {
  height: '48px',
  padding: '0 20px',
  borderRadius: 'var(--va-radius-card)',
  border: '1px solid var(--va-color-border)',
  backgroundColor: 'transparent',
  color: 'var(--va-color-text-primary)',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  cursor: 'pointer',
};

const previewAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '320px',
  padding: '16px',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  lineHeight: 1.7,
  resize: 'vertical',
  boxSizing: 'border-box',
};

const disclaimerBoxStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  backgroundColor: 'var(--va-color-field-blue)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '12px 16px',
};

const ringRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '32px',
  flexWrap: 'wrap',
};

const categoriesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
  flex: 1,
};

const categoryCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-background)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const categoryNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const categoryScoreStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
};

const categoryFeedbackStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.4,
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-old-glory-red)',
};

const loadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '32px 0',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

// Builds the download filename — no magic strings
function buildDownloadFilename(docType: WizardDocType): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${DOWNLOAD_FILENAME_PREFIX}-${docType}-${dateStamp}.txt`;
}

// Triggers a browser download of text content as a .txt file
function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const StepIndicator = React.memo(function StepIndicator({
  currentStep,
  totalSteps,
}: {
  readonly currentStep: number;
  readonly totalSteps: number;
}) {
  return (
    <div style={stepIndicatorStyle} aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <React.Fragment key={stepNum}>
            <div style={stepCircleStyle(isActive, isCompleted)} aria-current={isActive ? 'step' : undefined}>
              {isCompleted ? '✓' : stepNum}
            </div>
            {stepNum < totalSteps && <div style={stepConnectorStyle} />}
          </React.Fragment>
        );
      })}
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [selectedDocType, setSelectedDocType] = useState<WizardDocType | null>(null);
  // flowStep: 0=type select, 1/2/3=wizard steps, 4=preview/generating, 5=download+score
  const [flowStep, setFlowStep]               = useState(FLOW_STEP_TYPE_SELECT);
  const [answers, setAnswers]                 = useState<Record<string, string>>({});
  const [scoringMode, setScoringMode]         = useState<'encouraging' | 'strict'>('encouraging');
  const [generatedDoc, setGeneratedDoc]       = useState<GeneratedDocument | null>(null);
  const [isGenerating, setIsGenerating]       = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [isCrisisActive, setIsCrisisActive]   = useState(false);

  // Returns the current wizard step definition for the selected doc type
  const currentStepDef: WizardStepDef | null = selectedDocType && flowStep >= FLOW_STEP_WIZARD_BASE
    ? (WIZARD_STEP_DEFINITIONS[selectedDocType][flowStep - FLOW_STEP_WIZARD_BASE] ?? null)
    : null;

  const totalWizardSteps = selectedDocType ? WIZARD_STEP_DEFINITIONS[selectedDocType].length : 3;
  const isLastWizardStep = selectedDocType ? flowStep - FLOW_STEP_WIZARD_BASE === totalWizardSteps - 1 : false;

  const handleDocTypeSelect = useCallback((docType: WizardDocType) => {
    setSelectedDocType(docType);
    setAnswers({});
    setGeneratedDoc(null);
    setError(null);
    setFlowStep(FLOW_STEP_WIZARD_BASE);
  }, []);

  const handleAnswerChange = useCallback((fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleBack = useCallback(() => {
    if (flowStep === FLOW_STEP_WIZARD_BASE) {
      // Return to type selection
      setFlowStep(FLOW_STEP_TYPE_SELECT);
      setSelectedDocType(null);
    } else if (flowStep > FLOW_STEP_WIZARD_BASE) {
      setFlowStep((prev) => prev - 1);
    }
  }, [flowStep]);

  const handleNext = useCallback(() => {
    setFlowStep((prev) => prev + 1);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedDocType || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setFlowStep(FLOW_STEP_PREVIEW);

    try {
      const result = await apiClient.generateDocument({
        docType: selectedDocType,
        answers,
        scoringMode,
      });

      // Crisis flag may be embedded in the response
      if ((result as unknown as { crisisDetected?: boolean }).crisisDetected) {
        setIsCrisisActive(true);
        setIsGenerating(false);
        return;
      }

      setGeneratedDoc(result);
      setFlowStep(FLOW_STEP_DOWNLOAD);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Document generation failed. Please try again.');
      // Return to last wizard step on error
      setFlowStep(totalWizardSteps);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedDocType, answers, scoringMode, isGenerating, totalWizardSteps]);

  const handleDownload = useCallback(() => {
    if (!generatedDoc || !selectedDocType) return;
    downloadTextFile(generatedDoc.content, buildDownloadFilename(selectedDocType));
  }, [generatedDoc, selectedDocType]);

  const handleStartOver = useCallback(() => {
    setSelectedDocType(null);
    setFlowStep(FLOW_STEP_TYPE_SELECT);
    setAnswers({});
    setGeneratedDoc(null);
    setError(null);
    setIsCrisisActive(false);
  }, []);

  return (
    <div style={pageStyle}>
      {/* Required on all AI-powered screens */}
      <AIDisclosureBanner />

      {isCrisisActive && <CrisisLineBanner />}

      <div>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
      </div>

      {/* ── Step 0: Document type selection ───────────────────────────────── */}
      {flowStep === FLOW_STEP_TYPE_SELECT && (
        <section aria-label="Select document type">
          <div style={typeGridStyle}>
            {(Object.keys(WIZARD_STEP_DEFINITIONS) as WizardDocType[]).map((docType) => (
              <button
                key={docType}
                type="button"
                style={typeCardStyle(selectedDocType === docType)}
                onClick={() => handleDocTypeSelect(docType)}
                aria-pressed={selectedDocType === docType}
                aria-label={`Select ${DOC_TYPE_LABELS[docType]}`}
              >
                <span style={typeIconStyle} aria-hidden="true">{DOC_TYPE_ICONS[docType]}</span>
                <span style={typeLabelStyle}>{DOC_TYPE_LABELS[docType]}</span>
                <span style={typeDescStyle}>{DOC_TYPE_DESCRIPTIONS[docType]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Steps 1-3: Wizard form fields ─────────────────────────────────── */}
      {flowStep >= FLOW_STEP_WIZARD_BASE && flowStep < FLOW_STEP_PREVIEW && currentStepDef && selectedDocType && (
        <section aria-label={`Wizard step ${flowStep} of ${totalWizardSteps}`}>
          <StepIndicator currentStep={flowStep} totalSteps={totalWizardSteps} />

          <div style={{ marginTop: '20px', marginBottom: '8px' }}>
            <h2 style={stepTitleStyle}>{currentStepDef.title}</h2>
            <p style={stepDescStyle}>{currentStepDef.description}</p>
          </div>

          {/* Scoring mode toggle — only shown on last wizard step */}
          {isLastWizardStep && (
            <div style={{ ...buttonRowStyle, marginBottom: '16px' }} role="group" aria-label="Scoring mode">
              <span style={{ ...labelStyle, alignSelf: 'center' }}>Scoring:</span>
              <button
                type="button"
                style={scoringMode === 'encouraging' ? primaryButtonStyle : secondaryButtonStyle}
                onClick={() => setScoringMode('encouraging')}
                aria-pressed={scoringMode === 'encouraging'}
              >
                Encouraging
              </button>
              <button
                type="button"
                style={scoringMode === 'strict' ? primaryButtonStyle : secondaryButtonStyle}
                onClick={() => setScoringMode('strict')}
                aria-pressed={scoringMode === 'strict'}
              >
                Strict
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentStepDef.fields.map((field) => (
              <div key={field.id} style={fieldGroupStyle}>
                <label htmlFor={field.id} style={labelStyle}>
                  {field.label}
                  {field.required && <span aria-hidden="true"> *</span>}
                </label>
                {field.type === 'textarea' && (
                  <textarea
                    id={field.id}
                    style={textareaFieldStyle}
                    value={answers[field.id] ?? ''}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    aria-required={field.required}
                    aria-describedby={field.helpTooltip ? `${field.id}-hint` : undefined}
                  />
                )}
                {field.type === 'select' && field.options && (
                  <select
                    id={field.id}
                    style={selectStyle}
                    value={answers[field.id] ?? ''}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    aria-required={field.required}
                  >
                    <option value="">Select…</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'boolean' && (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      id={field.id}
                      type="checkbox"
                      checked={answers[field.id] === 'true'}
                      onChange={(e) => handleAnswerChange(field.id, e.target.checked ? 'true' : 'false')}
                      aria-required={field.required}
                      style={{ marginTop: '3px', flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: 'var(--va-font-body)', fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-primary)' }}>
                      {field.placeholder}
                    </span>
                  </label>
                )}
                {(field.type === 'text' || field.type === 'date') && (
                  <input
                    id={field.id}
                    type={field.type}
                    style={inputStyle}
                    value={answers[field.id] ?? ''}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    aria-required={field.required}
                    aria-describedby={field.helpTooltip ? `${field.id}-hint` : undefined}
                  />
                )}
                {field.helpTooltip && (
                  <span id={`${field.id}-hint`} style={tooltipStyle}>{field.helpTooltip}</span>
                )}
              </div>
            ))}
          </div>

          <div style={buttonRowStyle}>
            <button type="button" style={secondaryButtonStyle} onClick={handleBack} aria-label={LABEL_BACK}>
              {LABEL_BACK}
            </button>
            {isLastWizardStep ? (
              <button
                type="button"
                style={isGenerating ? primaryButtonDisabledStyle : primaryButtonStyle}
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
                aria-label={LABEL_GENERATE}
              >
                {isGenerating ? LABEL_GENERATING : LABEL_GENERATE}
              </button>
            ) : (
              <button type="button" style={primaryButtonStyle} onClick={handleNext} aria-label={LABEL_NEXT}>
                {LABEL_NEXT}
              </button>
            )}
          </div>

          {error && <p style={errorStyle} role="alert">{error}</p>}
        </section>
      )}

      {/* ── Step 4: Generating / loading state ────────────────────────────── */}
      {flowStep === FLOW_STEP_PREVIEW && isGenerating && (
        <section aria-label="Generating document" aria-live="polite">
          <p style={loadingStyle}>{LABEL_GENERATING} Your document is being assembled…</p>
        </section>
      )}

      {/* ── Step 5: Download + score ───────────────────────────────────────── */}
      {flowStep === FLOW_STEP_DOWNLOAD && generatedDoc && (
        <section aria-label="Generated document">
          <h2 style={{ ...stepTitleStyle, marginBottom: '8px' }}>{generatedDoc.title}</h2>

          <textarea
            readOnly
            value={generatedDoc.content}
            style={previewAreaStyle}
            aria-label="Generated document text"
          />

          <p style={disclaimerBoxStyle}>{DISCLAIMER_NOTICE}</p>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={handleDownload}
              aria-label={LABEL_DOWNLOAD}
            >
              {LABEL_DOWNLOAD}
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={handleStartOver}
              aria-label={LABEL_START_OVER}
            >
              {LABEL_START_OVER}
            </button>
          </div>

          {/* Auto-review score ring + categories */}
          <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--va-color-aged-canvas)', border: '1px solid var(--va-color-border)', borderRadius: 'var(--va-radius-card)' }}>
            <div style={ringRowStyle}>
              <ScoreRing score={generatedDoc.score.overall} label={SCORE_LABEL} size={120} />
              <div style={categoriesGridStyle}>
                {generatedDoc.score.categories.map((cat) => (
                  <div key={cat.name} style={categoryCardStyle}>
                    <span style={categoryNameStyle}>{cat.name.replace('_', ' ')}</span>
                    <span style={categoryScoreStyle}>{cat.score}%</span>
                    <span style={categoryFeedbackStyle}>{cat.feedback}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
