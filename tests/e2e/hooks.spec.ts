import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9100';

test.describe('Hooks Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/\/(codex|dashboard)/);
  });

  test('should navigate to Hooks Management page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Hooks Configuration');
    
    // Check that sections are visible
    await expect(page.locator('text=Platform Hooks')).toBeVisible();
    await expect(page.locator('text=Tenant Hooks')).toBeVisible();
  });

  test('should display security hooks section', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Check security hooks card
    await expect(page.locator('text=Security Hooks')).toBeVisible();
    await expect(page.locator('text=Block dangerous bash commands')).toBeVisible();
    await expect(page.locator('text=Block path traversal')).toBeVisible();
  });

  test('should display audit hooks section', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Check audit hooks card
    await expect(page.locator('text=Audit Hooks')).toBeVisible();
    await expect(page.locator('text=Log all tool executions')).toBeVisible();
  });

  test('should open security hooks configuration', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Click Configure on Security Hooks
    await page.click('button:has-text("Configure")');
    
    // Check that configuration panel is visible
    await expect(page.locator('text=Blocked Bash Patterns')).toBeVisible();
    await expect(page.locator('text=rm -rf /')).toBeVisible();
  });

  test('should display compliance hooks for tenant', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Check compliance hooks card
    await expect(page.locator('text=Compliance Hooks')).toBeVisible();
    await expect(page.locator('text=Detect NHS numbers')).toBeVisible();
    await expect(page.locator('text=Detect PII')).toBeVisible();
  });

  test('should toggle compliance hook options', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Find and click Configure on Compliance Hooks
    const complianceSection = page.locator('div:has-text("Compliance Hooks")').first();
    await complianceSection.locator('button:has-text("Configure")').click();
    
    // Toggle NHS numbers detection
    const nhsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /NHS/ }).first();
    await nhsCheckbox.check();
    
    // Verify it's checked
    await expect(nhsCheckbox).toBeChecked();
  });

  test('should display info box about hooks', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/hooks`);
    
    // Check info box
    await expect(page.locator('text=About Hooks')).toBeVisible();
    await expect(page.locator('text=pre/post tool execution validators')).toBeVisible();
  });
});

test.describe('Hooks Security Validation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(codex|dashboard)/);
  });

  test('should block dangerous bash command in Agent Console', async ({ page }) => {
    await page.goto(`${BASE_URL}/codex`);
    
    // Select a workspace (if available)
    const workspaceSelect = page.locator('select:has-text("Select a workspace")');
    const options = await workspaceSelect.locator('option').count();
    
    if (options > 1) {
      await workspaceSelect.selectOption({ index: 1 });
      
      // Select Claude runner
      await page.selectOption('select:has-text("Runner")', 'claude');
      
      // Create session
      await page.click('button:has-text("Create Session")');
      await page.waitForSelector('text=ready', { timeout: 10000 });
      
      // Send a dangerous command
      await page.fill('textarea', 'Run this command: rm -rf /');
      await page.click('button:has-text("Run Prompt")');
      
      // Wait for response and check for BLOCKED indicator
      await expect(page.locator('text=BLOCKED')).toBeVisible({ timeout: 30000 });
    }
  });
});
