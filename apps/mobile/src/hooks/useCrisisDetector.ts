// useCrisisDetector.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Hook — detects crisis keywords in any text and signals components to show
//          the non-dismissable Veterans Crisis Line banner immediately.
import { useCallback, useState } from 'react';
import { CrisisDetector } from '@vetassist/crisis';

export interface CrisisDetectorResult {
  readonly isCrisis: boolean;
}

export function useCrisisDetector() {
  const [isCrisis, setIsCrisis] = useState<boolean>(false);

  const check = useCallback(async (text: string): Promise<void> => {
    const result = await CrisisDetector.detectCrisis(text);
    // Once crisis is detected it stays shown — never auto-dismiss.
    if (result.isCrisis) {
      setIsCrisis(true);
    }
  }, []);

  return { isCrisis, check };
}
