// navigation.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Named tab route constants — zero magic strings anywhere in navigation code

export const TAB_HOME = 'Home' as const;
export const TAB_CHAT = 'Chat' as const;
export const TAB_DOCUMENTS = 'Documents' as const;
export const TAB_DISCOVER = 'Discover' as const;
export const TAB_COMMUNITY = 'Community' as const;

export type TabName =
  | typeof TAB_HOME
  | typeof TAB_CHAT
  | typeof TAB_DOCUMENTS
  | typeof TAB_DISCOVER
  | typeof TAB_COMMUNITY;
