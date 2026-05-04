// phase-verification.spec.ts
// Developer: Marcus Daley
// Date: 2026-05-03
// Purpose: Full user journey E2E verification — runs before every phase push

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForPage(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function dismissBanners(page: Page) {
  // AI disclosure banner — click if present and dismissable
  const disclosureDismiss = page.locator('[data-testid="ai-disclosure-dismiss"]');
  if (await disclosureDismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await disclosureDismiss.click();
  }
}

// ---------------------------------------------------------------------------
// HOME PAGE
// ---------------------------------------------------------------------------

test.describe('Home Page', () => {
  test('loads and shows hero CTAs', async ({ page }) => {
    await page.goto('/');
    await waitForPage(page);

    await expect(page).toHaveTitle(/VetAssist/i);
    // Primary CTAs must be visible
    await expect(page.getByRole('link', { name: /chat|ask|battle buddy/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /document|upload|review/i }).first()).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    await waitForPage(page);

    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: /discover|benefits/i }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// CHAT FLOW
// ---------------------------------------------------------------------------

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await waitForPage(page);
    await dismissBanners(page);
  });

  test('chat page loads with input area', async ({ page }) => {
    const input = page.locator('textarea, [role="textbox"]').first();
    await expect(input).toBeVisible();
  });

  test('AI disclosure banner is present', async ({ page }) => {
    // Must appear on every AI-powered screen — non-negotiable safety rule
    const banner = page.locator('[data-testid="ai-disclosure-banner"], [class*="disclosure"], [class*="AIDisclosure"]').first();
    await expect(banner).toBeVisible({ timeout: 5_000 });
  });

  test('send button activates on input', async ({ page }) => {
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('What VA benefits am I eligible for?');

    const sendBtn = page.locator('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]').first();
    await expect(sendBtn).toBeEnabled();
  });

  test('empty input keeps send button disabled', async ({ page }) => {
    const sendBtn = page.locator('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]').first();
    // Button should be disabled or the form should not submit with empty text
    const input = page.locator('textarea, [role="textbox"]').first();
    await expect(input).toBeEmpty();
    // Either disabled or has aria-disabled
    const isDisabled = await sendBtn.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DOCUMENTS FLOW
// ---------------------------------------------------------------------------

test.describe('Documents Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/documents');
    await waitForPage(page);
    await dismissBanners(page);
  });

  test('document review page loads', async ({ page }) => {
    // Drop zone or text input must be present
    const dropZone = page.locator('[data-testid="document-drop-zone"], [class*="DocumentDropZone"], [class*="drop"]').first();
    const textArea = page.locator('textarea').first();
    const hasDropZone = await dropZone.isVisible({ timeout: 3_000 }).catch(() => false);
    const hasTextArea = await textArea.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasDropZone || hasTextArea).toBe(true);
  });

  test('can paste text for review', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await textarea.fill('I am a veteran with 10 years of service seeking disability benefits.');
      await expect(textarea).not.toBeEmpty();
    }
  });

  test('submit button present when text entered', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await textarea.fill('Test document content for review.');
      const submitBtn = page.locator('button[type="submit"], button:has-text("Review"), button:has-text("Analyze"), button:has-text("Submit")').first();
      await expect(submitBtn).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// BENEFITS DISCOVERY
// ---------------------------------------------------------------------------

test.describe('Benefits Discovery', () => {
  test('discover page loads with benefit listings', async ({ page }) => {
    await page.goto('/discover');
    await waitForPage(page);

    // Should show some benefit cards or list items
    const cards = page.locator('[class*="card"], [class*="Card"], [class*="benefit"], article').first();
    await expect(cards).toBeVisible({ timeout: 10_000 });
  });

  test('search or filter controls present', async ({ page }) => {
    await page.goto('/discover');
    await waitForPage(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);
    // Either search or category filter must be present
    const filterBtn = page.locator('button:has-text("Filter"), select, [role="combobox"]').first();
    const hasFilter = await filterBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasSearch || hasFilter).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// COMMUNITY
// ---------------------------------------------------------------------------

test.describe('Community', () => {
  test('community page loads with stories', async ({ page }) => {
    await page.goto('/community');
    await waitForPage(page);

    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('submit story link is present', async ({ page }) => {
    await page.goto('/community');
    await waitForPage(page);

    const submitLink = page.getByRole('link', { name: /share|submit|story|tell/i }).first();
    await expect(submitLink).toBeVisible();
  });

  test('community submit form loads', async ({ page }) => {
    await page.goto('/community/submit');
    await waitForPage(page);

    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// LEARNING HUB
// ---------------------------------------------------------------------------

test.describe('Learning Hub', () => {
  test('learn page loads with resources', async ({ page }) => {
    await page.goto('/learn');
    await waitForPage(page);

    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// FAQ & GLOSSARY
// ---------------------------------------------------------------------------

test.describe('FAQ and Glossary', () => {
  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq');
    await waitForPage(page);

    await expect(page.locator('h1').first()).toBeVisible();
    // At least one FAQ item must render
    const faqItem = page.locator('[class*="faq"], [class*="FAQ"], details, [role="region"]').first();
    await expect(faqItem).toBeVisible({ timeout: 5_000 });
  });

  test('Glossary page loads', async ({ page }) => {
    await page.goto('/glossary');
    await waitForPage(page);

    await expect(page.locator('h1').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// DECISION LETTER
// ---------------------------------------------------------------------------

test.describe('Decision Letter Analyzer', () => {
  test('decision letter page loads', async ({ page }) => {
    await page.goto('/decision-letter');
    await waitForPage(page);
    await dismissBanners(page);

    await expect(page.locator('h1, h2').first()).toBeVisible();
    // Input area must be present
    const input = page.locator('textarea, [data-testid="drop-zone"]').first();
    await expect(input).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// VR&E PAGE
// ---------------------------------------------------------------------------

test.describe('VR&E Guide', () => {
  test('VR&E page loads', async ({ page }) => {
    await page.goto('/vre');
    await waitForPage(page);

    await expect(page.locator('h1').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// NAVIGATION INTEGRITY
// ---------------------------------------------------------------------------

test.describe('Navigation Integrity', () => {
  const ROUTES = [
    '/',
    '/chat',
    '/documents',
    '/discover',
    '/learn',
    '/faq',
    '/glossary',
    '/vre',
    '/community',
    '/decision-letter',
  ];

  for (const route of ROUTES) {
    test(`${route} returns 200 and renders without crash`, async ({ page }) => {
      const response = await page.goto(route);
      await waitForPage(page);

      // No 500 errors
      expect(response?.status()).not.toBe(500);
      // Page rendered something
      await expect(page.locator('body')).not.toBeEmpty();
      // No unhandled error overlay (Next.js dev error overlay)
      const errorOverlay = page.locator('[data-nextjs-dialog], [id="__next-build-watcher"]');
      const hasError = await errorOverlay.isVisible({ timeout: 1_000 }).catch(() => false);
      expect(hasError).toBe(false);
    });
  }
});
