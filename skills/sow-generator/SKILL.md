---
name: sow-generator
description: Generate professional Statement of Work (SoW) documents for NHS Trusts and enterprise customers. Use when the user asks to create a SoW, statement of work, project scope document, or contract deliverables. Produces structured SoW with scope, timeline, deliverables, pricing, and terms.
allowed-tools: Read, Write, Bash(python scripts/*:*)
user-invocable: true
---

# Statement of Work Generator

## Quick Start

To generate a SoW, provide:
1. Customer name and type (NHS Trust / Enterprise / SMB)
2. Project name and description
3. Key deliverables
4. Timeline (start date, duration)
5. Pricing model (fixed / T&M / hybrid)

## Workflow

Copy this checklist and track progress:
```
SoW Generation Progress:
- [ ] Step 1: Gather requirements from user
- [ ] Step 2: Select appropriate template
- [ ] Step 3: Fill in project details
- [ ] Step 4: Define scope and deliverables
- [ ] Step 5: Create timeline and milestones
- [ ] Step 6: Add pricing and payment terms
- [ ] Step 7: Include terms and conditions
- [ ] Step 8: Review and finalize
```

## Output Template

ALWAYS use this exact structure:

```markdown
# Statement of Work

**Document ID**: SOW-[CUSTOMER]-[YYYY]-[NNN]
**Version**: 1.0
**Date**: [DATE]
**Status**: Draft

---

## 1. Parties

**Service Provider**: [Your Company Name]
**Customer**: [Customer Name]
**Customer Type**: [NHS Trust / Enterprise / SMB]

---

## 2. Executive Summary

[One paragraph overview of the engagement, objectives, and expected outcomes]

---

## 3. Scope of Work

### 3.1 In Scope
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

### 3.2 Out of Scope
- [Exclusion 1]
- [Exclusion 2]

### 3.3 Assumptions
- [Assumption 1]
- [Assumption 2]

---

## 4. Deliverables

| ID | Deliverable | Description | Acceptance Criteria | Due Date |
|----|-------------|-------------|---------------------|----------|
| D1 | [Name] | [Description] | [Criteria] | [Date] |
| D2 | [Name] | [Description] | [Criteria] | [Date] |

---

## 5. Timeline & Milestones

| Phase | Milestone | Start Date | End Date | Duration |
|-------|-----------|------------|----------|----------|
| 1 | [Milestone] | [Date] | [Date] | [Weeks] |
| 2 | [Milestone] | [Date] | [Date] | [Weeks] |

### Gantt Chart
[Generate Mermaid Gantt chart if requested]

---

## 6. Pricing

### 6.1 Pricing Model
[Fixed Price / Time & Materials / Hybrid]

### 6.2 Cost Breakdown

| Item | Description | Quantity | Unit Price | Total |
|------|-------------|----------|------------|-------|
| [Item] | [Desc] | [Qty] | [Price] | [Total] |

**Total Project Cost**: £[AMOUNT]

### 6.3 Payment Schedule

| Milestone | Amount | Due Date | Condition |
|-----------|--------|----------|-----------|
| [Milestone] | £[Amount] | [Date] | [Condition] |

---

## 7. Team & Resources

| Role | Name | Allocation | Responsibilities |
|------|------|------------|------------------|
| Project Manager | [Name] | [%] | [Responsibilities] |
| Technical Lead | [Name] | [%] | [Responsibilities] |

---

## 8. Governance

### 8.1 Communication
- Weekly status meetings: [Day/Time]
- Monthly steering committee: [Day/Time]
- Escalation path: [Contact details]

### 8.2 Change Control
All changes to scope require written Change Request approval.

---

## 9. Terms & Conditions

### 9.1 Acceptance
Deliverables accepted within [N] business days of submission.

### 9.2 Warranty
[N] months warranty on delivered work.

### 9.3 Confidentiality
Both parties agree to maintain confidentiality of proprietary information.

---

## 10. Signatures

| Party | Name | Title | Signature | Date |
|-------|------|-------|-----------|------|
| Provider | | | | |
| Customer | | | | |

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial draft |
```

## Customer Type Variations

### NHS Trust
For NHS customers, include:
- NHS Digital standards compliance
- IG Toolkit requirements
- DCB0129 clinical safety (if applicable)
- Data Processing Agreement reference
- See [templates/sow-nhs-addendum.md](templates/sow-nhs-addendum.md)

### Enterprise
For enterprise customers, include:
- SLA commitments
- Security certifications (ISO 27001, SOC 2)
- Disaster recovery provisions
- See [templates/sow-enterprise-addendum.md](templates/sow-enterprise-addendum.md)

## Examples

See [examples/](examples/) for sample SoW documents:
- `sample-sow-nhs.md` - NHS Trust example
- `sample-sow-enterprise.md` - Enterprise example
