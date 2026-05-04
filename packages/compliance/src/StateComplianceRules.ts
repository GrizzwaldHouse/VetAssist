// StateComplianceRules.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Registry of state-specific AI text compliance rules — stricter phrasings by US state code

import type { ComplianceStateRule } from '@vetassist/shared-types';

// CA — California has broader unauthorized practice of law exposure for directive language
const CA_RULES: readonly ComplianceStateRule[] = [
  {
    description: 'CA: Replace directional filing language with educational framing',
    pattern: /\byou should file\b/gi,
    replacement: 'veterans in this situation often consider filing',
  },
  {
    description: 'CA: Remove outcome-adjacent success language',
    pattern: /\blikely to (be approved|succeed|win)\b/gi,
    replacement: 'may be worth exploring',
  },
  {
    description: 'CA: Replace eligibility assertion with discovery framing',
    pattern: /\byou (are|would be) eligible for\b/gi,
    replacement: 'you may want to review eligibility for',
  },
];

// NY — New York requires explicit non-attorney framing for claims-adjacent guidance
const NY_RULES: readonly ComplianceStateRule[] = [
  {
    description: 'NY: Soften directive appeal language',
    pattern: /\byou must appeal\b/gi,
    replacement: 'appealing is an option you can explore',
  },
  {
    description: 'NY: Remove rate-of-success implications',
    pattern: /\bstrong (case|claim|appeal)\b/gi,
    replacement: 'documented situation',
  },
  {
    description: 'NY: Replace strategic recommendation framing',
    pattern: /\bthe best strategy (is|would be)\b/gi,
    replacement: 'one approach veterans use',
  },
];

// TX — Texas VSO regulation requires educational framing for claims-adjacent language
const TX_RULES: readonly ComplianceStateRule[] = [
  {
    description: 'TX: Replace prescriptive claims submission language',
    pattern: /\byou need to submit\b/gi,
    replacement: 'veterans typically submit',
  },
  {
    description: 'TX: Soften rating outcome language',
    pattern: /\byou (will|should) receive a (higher |lower )?(rating|percentage)\b/gi,
    replacement: 'a rating decision will be made based on the evidence',
  },
  {
    description: 'TX: Replace VSO recommendation directive',
    pattern: /\byou should contact a VSO\b/gi,
    replacement: 'contacting a VA-accredited VSO is an option',
  },
];

// Central registry — maps uppercase state code to its rule set
// States not listed here have no additional rules beyond the federal compliance baseline
const STATE_RULES_REGISTRY: Readonly<Record<string, readonly ComplianceStateRule[]>> = {
  CA: CA_RULES,
  NY: NY_RULES,
  TX: TX_RULES,
};

// Returns the rule set for a given state code, or undefined if no rules exist for that state
function getRulesForState(stateCode: string): readonly ComplianceStateRule[] | undefined {
  if (!stateCode) return undefined;
  return STATE_RULES_REGISTRY[stateCode.toUpperCase()];
}

// Applies all rules for a state to the input text — returns modified text
// Resets lastIndex after each replace to prevent stateful regex bugs across multiple calls
function applyStateRules(text: string, rules: readonly ComplianceStateRule[]): string {
  let result = text;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement);
    rule.pattern.lastIndex = 0;
  }
  return result;
}

export const StateComplianceRules = { getRulesForState, applyStateRules } as const;
