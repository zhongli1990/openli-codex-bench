---
name: project-charter
description: Create professional project charter documents for project initiation. Use when the user asks for project charter, project initiation document, PID, or project kickoff documentation. Produces structured charter with objectives, scope, stakeholders, milestones, and governance.
allowed-tools: Read, Write
user-invocable: true
---

# Project Charter Generator

## Quick Start

To generate a Project Charter, provide:
1. Project name and sponsor
2. Business problem/opportunity
3. Project objectives
4. Key stakeholders
5. High-level timeline
6. Budget (if known)

## Workflow

Copy this checklist and track progress:
```
Project Charter Progress:
- [ ] Step 1: Identify project sponsor and stakeholders
- [ ] Step 2: Define business case and objectives
- [ ] Step 3: Define scope (in/out)
- [ ] Step 4: Identify key deliverables
- [ ] Step 5: Create high-level timeline
- [ ] Step 6: Estimate budget and resources
- [ ] Step 7: Identify risks and assumptions
- [ ] Step 8: Define governance structure
- [ ] Step 9: Obtain sponsor approval
```

## Output Template

ALWAYS use this exact structure:

```markdown
# Project Charter

**Project Name**: [Project Name]
**Document ID**: PC-[PROJECT]-[YYYY]-[NNN]
**Version**: 1.0
**Date**: [DATE]
**Status**: Draft

---

## 1. Project Overview

### 1.1 Project Title
[Full project name]

### 1.2 Project Sponsor
| Name | Title | Department | Contact |
|------|-------|------------|---------|
| [Name] | [Title] | [Dept] | [Email] |

### 1.3 Project Manager
| Name | Title | Department | Contact |
|------|-------|------------|---------|
| [Name] | [Title] | [Dept] | [Email] |

---

## 2. Business Case

### 2.1 Problem Statement
[Clear description of the business problem or opportunity]

### 2.2 Business Justification
[Why this project should be undertaken - strategic alignment, ROI, etc.]

### 2.3 Expected Benefits

| Benefit | Type | Measurement | Target |
|---------|------|-------------|--------|
| [Benefit 1] | Quantitative | [Metric] | [Value] |
| [Benefit 2] | Qualitative | [Metric] | [Value] |

---

## 3. Project Objectives

### 3.1 SMART Objectives

| ID | Objective | Success Criteria | Target Date |
|----|-----------|------------------|-------------|
| O1 | [Specific, Measurable objective] | [How measured] | [Date] |
| O2 | [Specific, Measurable objective] | [How measured] | [Date] |

### 3.2 Key Results
- KR1: [Key result 1]
- KR2: [Key result 2]
- KR3: [Key result 3]

---

## 4. Scope

### 4.1 In Scope
- [Deliverable/feature 1]
- [Deliverable/feature 2]
- [Deliverable/feature 3]

### 4.2 Out of Scope
- [Exclusion 1] - Reason: [Why excluded]
- [Exclusion 2] - Reason: [Why excluded]

### 4.3 Assumptions
- [Assumption 1]
- [Assumption 2]

### 4.4 Constraints
- [Constraint 1]
- [Constraint 2]

---

## 5. Deliverables

| ID | Deliverable | Description | Owner | Due Date |
|----|-------------|-------------|-------|----------|
| D1 | [Name] | [Description] | [Owner] | [Date] |
| D2 | [Name] | [Description] | [Owner] | [Date] |
| D3 | [Name] | [Description] | [Owner] | [Date] |

---

## 6. Timeline & Milestones

### 6.1 High-Level Timeline

| Phase | Description | Start | End | Duration |
|-------|-------------|-------|-----|----------|
| Initiation | Project setup | [Date] | [Date] | [Weeks] |
| Planning | Detailed planning | [Date] | [Date] | [Weeks] |
| Execution | Development | [Date] | [Date] | [Weeks] |
| Closure | Handover | [Date] | [Date] | [Weeks] |

### 6.2 Key Milestones

| Milestone | Description | Target Date | Dependencies |
|-----------|-------------|-------------|--------------|
| M1 | [Milestone 1] | [Date] | [Dependencies] |
| M2 | [Milestone 2] | [Date] | [Dependencies] |
| M3 | [Milestone 3] | [Date] | [Dependencies] |

---

## 7. Budget

### 7.1 Budget Summary

| Category | Estimated Cost | Notes |
|----------|----------------|-------|
| Personnel | £[Amount] | [Notes] |
| Technology | £[Amount] | [Notes] |
| External Services | £[Amount] | [Notes] |
| Contingency (10%) | £[Amount] | |
| **Total** | **£[Amount]** | |

### 7.2 Funding Source
[How the project will be funded]

---

## 8. Stakeholders

### 8.1 Stakeholder Register

| Name | Role | Interest | Influence | Engagement |
|------|------|----------|-----------|------------|
| [Name] | Sponsor | High | High | Manage Closely |
| [Name] | User Rep | High | Medium | Keep Informed |
| [Name] | Technical | Medium | High | Keep Satisfied |

### 8.2 RACI Matrix

| Activity | Sponsor | PM | Tech Lead | Users |
|----------|---------|-----|-----------|-------|
| Approve charter | A | R | C | I |
| Define requirements | A | R | C | C |
| Technical design | I | A | R | C |
| Testing | I | A | R | C |
| Go-live approval | A | R | C | I |

**Legend**: R=Responsible, A=Accountable, C=Consulted, I=Informed

---

## 9. Risks

### 9.1 Initial Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | [Risk description] | High/Med/Low | High/Med/Low | [Mitigation] |
| R2 | [Risk description] | High/Med/Low | High/Med/Low | [Mitigation] |

---

## 10. Governance

### 10.1 Decision Authority

| Decision Type | Authority | Escalation |
|---------------|-----------|------------|
| Scope changes | PM (minor), Sponsor (major) | Steering Committee |
| Budget changes | PM (<5%), Sponsor (>5%) | Steering Committee |
| Timeline changes | PM (<1 week), Sponsor (>1 week) | Steering Committee |

### 10.2 Meetings

| Meeting | Frequency | Attendees | Purpose |
|---------|-----------|-----------|---------|
| Daily Standup | Daily | Team | Status sync |
| Weekly Status | Weekly | PM, Leads | Progress review |
| Steering Committee | Monthly | Sponsor, PM | Governance |

### 10.3 Reporting

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Status Report | Weekly | Stakeholders | Progress, risks, issues |
| Dashboard | Real-time | All | KPIs, metrics |

---

## 11. Approval

### 11.1 Charter Approval

By signing below, the Project Sponsor authorizes the project to proceed.

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | | | |
| Project Manager | | | |

### 11.2 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial draft |
```

## Variations

### NHS Trust Projects
For NHS projects, include:
- NHS Digital alignment
- Clinical safety considerations
- Information Governance requirements
- See [templates/nhs-charter-addendum.md](templates/nhs-charter-addendum.md)

### Agile Projects
For Agile projects, adapt:
- Replace phases with iterations/sprints
- Use product backlog instead of fixed scope
- See [templates/agile-charter.md](templates/agile-charter.md)
