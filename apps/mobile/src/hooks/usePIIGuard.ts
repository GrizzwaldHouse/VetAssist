// usePIIGuard.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Hook — runs every text input through the PII detector before any processing.
//          Returns cleaned text and detection metadata so components can warn the user.
import { useCallback } from 'react';
import { PIIDetector } from '@vetassist/pii';

export interface PIIGuardResult {
  readonly clean: string;
  readonly piiDetected: boolean;
  readonly piiTypes: ReadonlyArray<string>;
}

export function usePIIGuard() {
  const scan = useCallback((input: string): PIIGuardResult => {
    const result = PIIDetector.scan(input);
    return {
      clean: result.sanitizedText,
      piiDetected: result.hasPII,
      piiTypes: result.detectedTypes,
    };
  }, []);

  return { scan };
}
