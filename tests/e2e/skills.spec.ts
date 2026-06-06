import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9100';

test.describe('Skills Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or codex
    await page.waitForURL(/\/(codex|dashboard)/);
  });

  test('should navigate to Skills Management page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Skills Management');
    
    // Check that skills list is visible
    await expect(page.locator('text=All Scopes')).toBeVisible();
  });

  test('should list platform skills', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Wait for skills to load
    await page.waitForSelector('text=sow-generator', { timeout: 10000 });
    
    // Check that some expected skills are visible
    await expect(page.locator('text=sow-generator')).toBeVisible();
    await expect(page.locator('text=test-strategy')).toBeVisible();
    await expect(page.locator('text=architecture-design')).toBeVisible();
  });

  test('should filter skills by scope', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Wait for initial load
    await page.waitForSelector('text=sow-generator', { timeout: 10000 });
    
    // Filter by platform scope
    await page.selectOption('select', 'platform');
    
    // All visible skills should have platform badge
    const platformBadges = page.locator('text=platform').filter({ hasText: 'platform' });
    await expect(platformBadges.first()).toBeVisible();
  });

  test('should search skills', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Wait for skills to load
    await page.waitForSelector('text=sow-generator', { timeout: 10000 });
    
    // Search for "sow"
    await page.fill('input[placeholder="Search skills..."]', 'sow');
    
    // Only sow-generator should be visible
    await expect(page.locator('text=sow-generator')).toBeVisible();
    
    // Other skills should not be visible
    await expect(page.locator('text=test-strategy')).not.toBeVisible();
  });

  test('should view skill details', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Wait for skills to load
    await page.waitForSelector('text=sow-generator', { timeout: 10000 });
    
    // Click on a skill
    await page.click('text=sow-generator');
    
    // Wait for detail panel to load
    await page.waitForSelector('text=SKILL.md Content', { timeout: 5000 });
    
    // Check that skill content is displayed
    await expect(page.locator('text=Statement of Work Generator')).toBeVisible();
  });

  test('should open edit mode for skill', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Wait for skills to load and select one
    await page.waitForSelector('text=sow-generator', { timeout: 10000 });
    await page.click('text=sow-generator');
    
    // Wait for detail panel
    await page.waitForSelector('text=SKILL.md Content', { timeout: 5000 });
    
    // Click Edit button
    await page.click('button:has-text("Edit")');
    
    // Check that edit mode is active
    await expect(page.locator('text=Change Summary')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should open new skill modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Click New Skill button
    await page.click('button:has-text("New Skill")');
    
    // Check modal is visible
    await expect(page.locator('text=Create New Skill')).toBeVisible();
    await expect(page.locator('input[placeholder="my-skill-name"]')).toBeVisible();
  });

  test('should validate skill name format', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/skills`);
    
    // Open new skill modal
    await page.click('button:has-text("New Skill")');
    
    // Try to enter invalid characters - they should be converted
    const nameInput = page.locator('input[placeholder="my-skill-name"]');
    await nameInput.fill('Test Skill Name!');
    
    // Check that the value is sanitized
    await expect(nameInput).toHaveValue('test-skill-name-');
  });
});

test.describe('Skills API E2E Tests', () => {
  test('should list skills via API', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/claude/skills`);
    
    expect(response.ok()).toBeTruthy();
    
    const skills = await response.json();
    expect(Array.isArray(skills)).toBeTruthy();
    expect(skills.length).toBeGreaterThan(0);
    
    // Check skill structure
    const skill = skills[0];
    expect(skill).toHaveProperty('name');
    expect(skill).toHaveProperty('description');
    expect(skill).toHaveProperty('scope');
    expect(skill).toHaveProperty('version');
  });

  test('should get skill detail via API', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/claude/skills/sow-generator?scope=platform`);
    
    expect(response.ok()).toBeTruthy();
    
    const skill = await response.json();
    expect(skill.name).toBe('sow-generator');
    expect(skill.scope).toBe('platform');
    expect(skill.content).toContain('Statement of Work');
  });

  test('should return 404 for non-existent skill', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/claude/skills/non-existent-skill?scope=platform`);
    
    expect(response.status()).toBe(404);
  });
});
