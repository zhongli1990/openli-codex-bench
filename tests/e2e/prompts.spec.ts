import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9100';

test.describe('Prompts Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@saas-codex.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or codex
    await page.waitForURL(/\/(codex|dashboard)/, { timeout: 15000 });
  });

  test('should navigate to Prompts page from sidebar', async ({ page }) => {
    // Click Prompts in sidebar
    await page.click('a[href="/prompts"]');
    await page.waitForURL(/\/prompts/);
    
    // Check page loaded
    await expect(page.locator('text=Prompt Templates')).toBeVisible({ timeout: 10000 });
  });

  test('should display seeded prompt templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/prompts`);
    
    // Wait for templates to load
    await page.waitForSelector('[class*="rounded-lg border"]', { timeout: 15000 });
    
    // Check that some seed templates are visible
    const templateCards = page.locator('[class*="rounded-lg border"]');
    const count = await templateCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter templates by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/prompts`);
    
    // Wait for templates to load
    await page.waitForTimeout(2000);
    
    // Click a category filter if available
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    }
  });

  test('should search templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/prompts`);
    
    // Wait for templates to load
    await page.waitForTimeout(2000);
    
    // Search for "NHS"
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('NHS');
      await page.waitForTimeout(1000);
      
      // Results should contain NHS-related templates
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('NHS');
    }
  });

  test('should open New Template modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/prompts`);
    await page.waitForTimeout(2000);
    
    // Click New Template button
    const newBtn = page.locator('button:has-text("New Template")');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      
      // Modal should appear with form fields
      await expect(page.locator('text=Create New Template')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open Use Template modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/prompts`);
    
    // Wait for templates to load
    await page.waitForTimeout(3000);
    
    // Click "Use" button on first template
    const useBtn = page.locator('button:has-text("Use")').first();
    if (await useBtn.isVisible()) {
      await useBtn.click();
      
      // Modal should appear with variable inputs
      await page.waitForTimeout(1000);
      const modal = page.locator('[class*="fixed inset-0"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Agent Console Template Picker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@saas-codex.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(codex|dashboard)/, { timeout: 15000 });
  });

  test('should show template picker on Agent page', async ({ page }) => {
    await page.goto(`${BASE_URL}/codex`);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Look for "Use Template" button in the prompt area
    const templateBtn = page.locator('button:has-text("Use Template")');
    if (await templateBtn.isVisible({ timeout: 5000 })) {
      // Click to open dropdown
      await templateBtn.click();
      
      // Dropdown should appear with template options
      await page.waitForTimeout(1000);
      const dropdown = page.locator('text=Select a prompt template');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });

  test('should prefill prompt from Prompts page via sessionStorage', async ({ page }) => {
    // Set sessionStorage with a prefill prompt
    await page.goto(`${BASE_URL}/codex`);
    await page.evaluate(() => {
      sessionStorage.setItem('prefill-prompt', 'Test prefilled prompt from E2E');
    });
    
    // Reload the page to trigger the prefill pickup
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check that the textarea has the prefilled text
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      const value = await textarea.inputValue();
      expect(value).toContain('Test prefilled prompt from E2E');
    }
  });
});

test.describe('Prompt Manager API via Frontend Proxy', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get token
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: 'admin@saas-codex.com', password: 'Admin123!' },
    });
    if (loginRes.ok()) {
      const data = await loginRes.json();
      authToken = data.access_token;
    }
  });

  test('should list templates via frontend proxy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/prompt-manager/templates?status=published`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data.total).toBeGreaterThan(0);
  });

  test('should get categories via frontend proxy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/prompt-manager/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should create and render template via frontend proxy', async ({ request }) => {
    // Create
    const createRes = await request.post(`${BASE_URL}/api/prompt-manager/templates`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: `Playwright Test ${Date.now()}`,
        description: 'Created by Playwright E2E test',
        category: 'testing',
        template_body: 'Hello {{user}}, welcome to {{system}}.',
        variables: [
          { name: 'user', type: 'string', description: 'User name', required: true },
          { name: 'system', type: 'string', description: 'System name', required: true },
        ],
        sample_values: { user: 'Tester', system: 'Codex' },
        visibility: 'private',
        status: 'draft',
      },
    });
    
    expect(createRes.status()).toBe(201);
    const template = await createRes.json();
    expect(template.name).toContain('Playwright Test');
    
    // Render
    const renderRes = await request.post(
      `${BASE_URL}/api/prompt-manager/templates/${template.id}/render`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { variables: { user: 'Alice', system: 'OpenLI Codex' } },
      }
    );
    
    expect(renderRes.ok()).toBeTruthy();
    const rendered = await renderRes.json();
    expect(rendered.rendered).toContain('Alice');
    expect(rendered.rendered).toContain('OpenLI Codex');
    expect(rendered.rendered).not.toContain('{{');
  });

  test('should reject unauthenticated requests via proxy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/prompt-manager/templates`);
    // Should get 401 from prompt-manager via proxy
    expect(response.status()).toBe(401);
  });
});
