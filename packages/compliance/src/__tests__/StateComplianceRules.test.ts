// StateComplianceRules.test.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Unit tests for state-specific compliance rule matching and text substitution

import { describe, it, expect } from 'vitest';
import { StateComplianceRules } from '../StateComplianceRules.js';

describe('StateComplianceRules', () => {
  describe('getRulesForState', () => {
    it('returns rules for CA', () => {
      const rules = StateComplianceRules.getRulesForState('CA');
      expect(rules).toBeDefined();
      expect(rules!.length).toBeGreaterThan(0);
    });

    it('returns rules for NY', () => {
      const rules = StateComplianceRules.getRulesForState('NY');
      expect(rules).toBeDefined();
      expect(rules!.length).toBeGreaterThan(0);
    });

    it('returns rules for TX', () => {
      const rules = StateComplianceRules.getRulesForState('TX');
      expect(rules).toBeDefined();
      expect(rules!.length).toBeGreaterThan(0);
    });

    it('returns undefined for an unknown state code', () => {
      expect(StateComplianceRules.getRulesForState('ZZ')).toBeUndefined();
    });

    it('is case-insensitive — lowercase state code resolves', () => {
      const rules = StateComplianceRules.getRulesForState('ca');
      expect(rules).toBeDefined();
    });

    it('returns undefined for empty string', () => {
      expect(StateComplianceRules.getRulesForState('')).toBeUndefined();
    });
  });

  describe('applyStateRules — CA', () => {
    const caRules = StateComplianceRules.getRulesForState('CA')!;

    it('rewrites "you should file" to educational framing', () => {
      const result = StateComplianceRules.applyStateRules('you should file your claim today', caRules);
      expect(result).toContain('veterans in this situation often consider filing');
      expect(result).not.toContain('you should file');
    });

    it('rewrites outcome-adjacent success language', () => {
      const result = StateComplianceRules.applyStateRules('This claim is likely to be approved', caRules);
      expect(result).not.toContain('likely to be approved');
      expect(result).toContain('may be worth exploring');
    });

    it('rewrites eligibility assertion to discovery framing', () => {
      const result = StateComplianceRules.applyStateRules('you are eligible for Chapter 35 benefits', caRules);
      expect(result).toContain('you may want to review eligibility for');
      expect(result).not.toContain('you are eligible for');
    });

    it('returns original text unchanged when no CA patterns match', () => {
      const text = 'Contact the VA for more information about your benefits.';
      const result = StateComplianceRules.applyStateRules(text, caRules);
      expect(result).toBe(text);
    });

    it('double-applying rules yields the same result — idempotent', () => {
      const text = 'you should file your claim because you are eligible for it';
      const firstPass = StateComplianceRules.applyStateRules(text, caRules);
      const secondPass = StateComplianceRules.applyStateRules(firstPass, caRules);
      expect(secondPass).toBe(firstPass);
    });
  });

  describe('applyStateRules — NY', () => {
    const nyRules = StateComplianceRules.getRulesForState('NY')!;

    it('rewrites "you must appeal"', () => {
      const result = StateComplianceRules.applyStateRules('you must appeal this decision', nyRules);
      expect(result).toContain('appealing is an option you can explore');
      expect(result).not.toContain('you must appeal');
    });

    it('rewrites strong case/claim language', () => {
      const result = StateComplianceRules.applyStateRules('you have a strong claim here', nyRules);
      expect(result).not.toContain('strong claim');
      expect(result).toContain('documented situation');
    });

    it('rewrites best strategy framing', () => {
      const result = StateComplianceRules.applyStateRules('the best strategy is to file quickly', nyRules);
      expect(result).toContain('one approach veterans use');
      expect(result).not.toContain('the best strategy is');
    });
  });

  describe('applyStateRules — TX', () => {
    const txRules = StateComplianceRules.getRulesForState('TX')!;

    it('rewrites prescriptive claims submission language', () => {
      const result = StateComplianceRules.applyStateRules('you need to submit the form today', txRules);
      expect(result).toContain('veterans typically submit');
      expect(result).not.toContain('you need to submit');
    });

    it('rewrites rating outcome language', () => {
      const result = StateComplianceRules.applyStateRules('you will receive a higher rating', txRules);
      expect(result).not.toContain('you will receive');
      expect(result).toContain('a rating decision will be made based on the evidence');
    });

    it('rewrites VSO recommendation directive', () => {
      const result = StateComplianceRules.applyStateRules('you should contact a VSO for help', txRules);
      expect(result).toContain('contacting a VA-accredited VSO is an option');
      expect(result).not.toContain('you should contact a VSO');
    });
  });

  describe('regex lastIndex safety', () => {
    it('re-applying the same rule set three times yields identical results', () => {
      const caRules = StateComplianceRules.getRulesForState('CA')!;
      const text = 'you should file your claim because you are eligible for this benefit';
      const first  = StateComplianceRules.applyStateRules(text, caRules);
      const second = StateComplianceRules.applyStateRules(text, caRules);
      const third  = StateComplianceRules.applyStateRules(text, caRules);
      expect(second).toBe(first);
      expect(third).toBe(first);
    });
  });
});
