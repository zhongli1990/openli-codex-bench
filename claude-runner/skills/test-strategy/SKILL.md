---
name: test-strategy
description: Create comprehensive test strategy documents for software projects. Use when the user asks for test strategy, testing approach, QA strategy, or quality assurance planning. Produces structured test strategy with test levels, scope, tools, environments, and risk assessment.
allowed-tools: Read, Write, Grep
user-invocable: true
---

# Test Strategy Generator

## Quick Start

To generate a Test Strategy, provide:
1. Project name and description
2. Technology stack
3. Testing scope (what to test)
4. Timeline constraints
5. Team size and skills

## Workflow

Copy this checklist and track progress:
```
Test Strategy Progress:
- [ ] Step 1: Understand project scope and requirements
- [ ] Step 2: Identify test levels and types
- [ ] Step 3: Define test scope (in/out)
- [ ] Step 4: Select testing tools and frameworks
- [ ] Step 5: Define test environments
- [ ] Step 6: Establish entry/exit criteria
- [ ] Step 7: Risk assessment and mitigation
- [ ] Step 8: Resource and schedule planning
- [ ] Step 9: Review and finalize
```

## Output Template

ALWAYS use this exact structure:

```markdown
# Test Strategy

**Project**: [Project Name]
**Version**: 1.0
**Date**: [DATE]
**Author**: [Author]
**Status**: Draft

---

## 1. Introduction

### 1.1 Purpose
This document defines the test strategy for [Project Name], outlining the testing approach, scope, resources, and schedule.

### 1.2 Scope
[Brief description of what this strategy covers]

### 1.3 References
| Document | Version | Location |
|----------|---------|----------|
| Requirements Spec | [Ver] | [Link] |
| Architecture Design | [Ver] | [Link] |

---

## 2. Test Levels

### 2.1 Test Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  ← Slow, expensive, high confidence
        ├─────────────┤
        │Integration  │  ← Medium speed, API/service tests
        │   (15%)     │
        ├─────────────┤
        │    Unit     │  ← Fast, cheap, foundation
        │   (80%)     │
        └─────────────┘
```

### 2.2 Test Level Details

| Level | Scope | Tools | Owner | Coverage Target |
|-------|-------|-------|-------|-----------------|
| Unit | Functions, classes | [pytest/Jest] | Developers | 80% |
| Integration | APIs, services | [pytest/Postman] | Developers | 70% |
| E2E | User workflows | [Playwright/Cypress] | QA | Critical paths |
| Performance | Load, stress | [k6/Locust] | QA | SLA targets |
| Security | OWASP Top 10 | [OWASP ZAP] | Security | All endpoints |

---

## 3. Test Scope

### 3.1 In Scope

| Feature | Test Types | Priority |
|---------|------------|----------|
| [Feature 1] | Unit, Integration, E2E | High |
| [Feature 2] | Unit, Integration | Medium |
| [Feature 3] | Unit | Low |

### 3.2 Out of Scope
- [Item 1] - Reason
- [Item 2] - Reason

### 3.3 Assumptions
- [Assumption 1]
- [Assumption 2]

---

## 4. Test Types

### 4.1 Functional Testing
- **Unit Tests**: Verify individual functions/methods
- **Integration Tests**: Verify component interactions
- **E2E Tests**: Verify complete user workflows
- **Regression Tests**: Verify existing functionality

### 4.2 Non-Functional Testing
- **Performance**: Response time, throughput, scalability
- **Security**: Authentication, authorization, data protection
- **Accessibility**: WCAG 2.1 AA compliance
- **Compatibility**: Browser/device matrix

---

## 5. Test Environment

### 5.1 Environment Matrix

| Environment | Purpose | Data | URL |
|-------------|---------|------|-----|
| Local | Development | Mock | localhost |
| Dev | Integration | Synthetic | dev.example.com |
| Staging | Pre-production | Anonymized | staging.example.com |
| Production | Live | Real | example.com |

### 5.2 Test Data Strategy
- **Unit Tests**: Mocked data, fixtures
- **Integration Tests**: Synthetic data, factories
- **E2E Tests**: Seeded test accounts
- **Performance Tests**: Generated load data

---

## 6. Tools & Frameworks

| Category | Tool | Purpose |
|----------|------|---------|
| Unit Testing | [pytest/Jest] | Unit test execution |
| Integration | [pytest/Supertest] | API testing |
| E2E | [Playwright] | Browser automation |
| Performance | [k6] | Load testing |
| Security | [OWASP ZAP] | Vulnerability scanning |
| Coverage | [Coverage.py/Istanbul] | Code coverage |
| CI/CD | [GitHub Actions] | Automated execution |

---

## 7. Entry & Exit Criteria

### 7.1 Entry Criteria
- [ ] Requirements documented and approved
- [ ] Test environment available
- [ ] Test data prepared
- [ ] Code deployed to test environment

### 7.2 Exit Criteria
- [ ] All critical test cases executed
- [ ] No P1/P2 defects open
- [ ] Code coverage >= [X]%
- [ ] Performance SLAs met
- [ ] Security scan passed

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Incomplete requirements | Medium | High | Early requirement reviews |
| Environment instability | Low | High | Environment monitoring |
| Resource constraints | Medium | Medium | Cross-training, prioritization |
| Third-party dependencies | Low | Medium | Mock services, contract tests |

---

## 9. Defect Management

### 9.1 Severity Levels

| Severity | Description | Response Time | Resolution Time |
|----------|-------------|---------------|-----------------|
| P1 - Critical | System down, data loss | 1 hour | 4 hours |
| P2 - High | Major feature broken | 4 hours | 24 hours |
| P3 - Medium | Feature degraded | 24 hours | 1 week |
| P4 - Low | Minor issue | 1 week | Next release |

### 9.2 Defect Workflow
```
New → Triaged → In Progress → Fixed → Verified → Closed
                    ↓
                 Rejected
```

---

## 10. Schedule

| Phase | Activities | Duration | Start | End |
|-------|------------|----------|-------|-----|
| Planning | Strategy, test cases | [X] days | [Date] | [Date] |
| Preparation | Environment, data | [X] days | [Date] | [Date] |
| Execution | Test cycles | [X] days | [Date] | [Date] |
| Reporting | Results, sign-off | [X] days | [Date] | [Date] |

---

## 11. Roles & Responsibilities

| Role | Responsibilities |
|------|------------------|
| QA Lead | Strategy, planning, reporting |
| QA Engineer | Test case design, execution |
| Developer | Unit tests, bug fixes |
| DevOps | Environment, CI/CD |
| Product Owner | Acceptance criteria, sign-off |

---

## 12. Reporting

### 12.1 Metrics
- Test execution progress
- Defect density
- Code coverage
- Test pass rate

### 12.2 Reports
- Daily: Test execution status
- Weekly: Progress summary, blockers
- Release: Final test report, sign-off

---

## Appendix A: Test Case Template

| Field | Description |
|-------|-------------|
| TC-ID | Unique identifier |
| Title | Brief description |
| Preconditions | Setup required |
| Steps | Numbered steps |
| Expected Result | What should happen |
| Actual Result | What happened |
| Status | Pass/Fail/Blocked |
```

## References

- **Test Plan Template**: See [reference/test-plan-template.md](reference/test-plan-template.md)
- **Test Report Template**: See [reference/test-report-template.md](reference/test-report-template.md)
- **Coverage Guidelines**: See [reference/coverage-guidelines.md](reference/coverage-guidelines.md)
