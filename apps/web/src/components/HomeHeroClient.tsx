// HomeHeroClient.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Client boundary wrapper for HomeHero — HomeHero has event handlers requiring client rendering

'use client';

import React from 'react';
import { HomeHero } from '@vetassist/ui-components/src/HomeHero.js';

export function HomeHeroClient() {
  return <HomeHero />;
}
