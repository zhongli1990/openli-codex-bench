---
name: code-review
description: Review code for quality, security, and best practices. Use when the user asks for a code review, PR review, audit, or to check code quality.
allowed-tools: Read, Grep, Glob
---

# Code Review Skill

When reviewing code, follow this structured approach:

## 1. Security Check
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] Input validation on all user inputs
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] No eval(), exec(), or similar with user input
- [ ] Proper authentication and authorization checks
- [ ] HTTPS enforced for sensitive data

## 2. Code Quality
- [ ] Functions are small and focused (single responsibility)
- [ ] Clear, descriptive naming conventions
- [ ] Proper error handling with meaningful messages
- [ ] No code duplication (DRY principle)
- [ ] Appropriate use of comments (explain why, not what)
- [ ] Consistent code style and formatting

## 3. Performance
- [ ] No N+1 database queries
- [ ] Efficient algorithms (appropriate time/space complexity)
- [ ] Proper caching where beneficial
- [ ] No memory leaks (cleanup of resources)
- [ ] Lazy loading for expensive operations

## 4. Maintainability
- [ ] Code is testable (dependency injection, etc.)
- [ ] Clear separation of concerns
- [ ] Appropriate abstraction levels
- [ ] Documentation for public APIs

## Output Format

Provide findings organized by severity:

### 🔴 Critical
Issues that must be fixed before deployment (security vulnerabilities, data loss risks)

### 🟠 Warning
Issues that should be addressed soon (performance problems, code smells)

### 🟡 Info
Suggestions for improvement (style, best practices)

### ✅ Good Practices
Highlight what's done well to reinforce good patterns
