# Skills Architecture Design

## Enterprise Virtual Software House

**Version**: v0.7.0 (Draft)  
**Last Updated**: Feb 8, 2026

---

## Executive Summary

This document defines the Skills architecture for an enterprise SaaS multi-tenant platform operating as a **Virtual Software House**. Based on Claude Agent SDK best practices, we propose a **three-tier Skills hierarchy** with role-based specialization, deliverable templates, and workflow automation.

---

## 1. Skills Architecture Overview

### 1.1 Three-Tier Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: PLATFORM SKILLS                             │
│  Location: /app/skills/ (Global - bundled in Docker image)                  │
│  Scope: All tenants, all workspaces                                         │
│  Purpose: Core capabilities, security, compliance                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 2: TENANT SKILLS                               │
│  Location: /workspaces/{tenant}/.claude/skills/                             │
│  Scope: Tenant-specific (e.g., NHS Trust, Enterprise customer)              │
│  Purpose: Industry templates, customer branding, compliance rules           │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 3: PROJECT SKILLS                              │
│  Location: /workspaces/{tenant}/{project}/.claude/skills/                   │
│  Scope: Project-specific                                                    │
│  Purpose: Project conventions, team workflows, sprint templates             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Override Precedence

```
Project Skills > Tenant Skills > Platform Skills
```

A Skill with the same `name` at a lower tier overrides the higher tier, enabling:
- Platform defaults with tenant customization
- Tenant standards with project-specific tweaks

### 1.3 Role-Based Skill Organization

```
skills/
├── core/                    # Platform-wide utilities
│   ├── code-review/
│   ├── security-audit/
│   └── healthcare-compliance/
│
├── sales/                   # Sales & Pre-sales
│   ├── sow-generator/
│   ├── proposal-writer/
│   └── nhs-bid-response/
│
├── project-management/      # Project Manager
│   ├── project-charter/
│   ├── status-report/
│   └── risk-register/
│
├── product/                 # Product Manager
│   ├── prd-writer/
│   ├── roadmap-planner/
│   └── sprint-planning/
│
├── architecture/            # Software Architects
│   ├── requirements-spec/
│   ├── architecture-design/
│   └── service-guide/
│
├── development/             # Developers
│   ├── implementation-spec/
│   ├── code-generator/
│   └── pr-reviewer/
│
├── qa/                      # QA Testers
│   ├── test-strategy/
│   ├── test-plan/
│   └── test-automation/
│
└── support/                 # Service & Support
    ├── user-guide/
    ├── troubleshooting/
    └── sla-report/
```

---

## 2. Role-Specific Skills Design

### 2.1 Sales & Pre-Sales

**Purpose**: Generate professional sales deliverables for NHS Trusts and enterprise customers.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `sow-generator` | Generate Statement of Work documents | SoW with scope, timeline, pricing |
| `proposal-writer` | Create sales proposals and RFP responses | Executive summary, solution overview, pricing |
| `nhs-bid-response` | NHS-specific bid responses with compliance | NHS Digital standards, IG Toolkit references |
| `roi-calculator` | Calculate and present ROI analysis | Financial projections, cost-benefit analysis |
| `competitor-analysis` | Analyze competitive positioning | Feature comparison, differentiation points |

**Skill Structure Example**:
```
sales/
├── sow-generator/
│   ├── SKILL.md              # Main instructions
│   ├── templates/
│   │   ├── sow-nhs.md        # NHS Trust template
│   │   ├── sow-enterprise.md # Enterprise template
│   │   └── sow-smb.md        # SMB template
│   ├── examples/
│   │   └── sample-sow.md     # Example output
│   └── scripts/
│       └── validate_sow.py   # Validation script
```

### 2.2 Project Management

**Purpose**: Standardized PM deliverables in predefined formats.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `project-charter` | Create project charter documents | Objectives, scope, stakeholders, milestones |
| `status-report` | Generate weekly/monthly status reports | RAG status, progress, risks, next steps |
| `risk-register` | Maintain risk register | Risk ID, description, impact, mitigation |
| `change-request` | Process change requests | CR form, impact analysis, approval workflow |
| `lessons-learned` | Document project retrospectives | What worked, improvements, recommendations |
| `gantt-generator` | Generate project timelines | Mermaid Gantt charts, milestone tracking |

**Skill Structure Example**:
```
project-management/
├── status-report/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── weekly-status.md
│   │   ├── monthly-status.md
│   │   └── executive-summary.md
│   └── reference/
│       └── rag-definitions.md
```

### 2.3 Product Management

**Purpose**: Product features, roadmap, and agile artifacts.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `prd-writer` | Write Product Requirements Documents | PRD with user stories, acceptance criteria |
| `roadmap-planner` | Create product roadmaps | Quarterly roadmap, feature prioritization |
| `sprint-planning` | Plan sprints and iterations | Sprint goals, backlog grooming, capacity |
| `feature-spec` | Detailed feature specifications | User flows, wireframes, edge cases |
| `release-notes` | Generate release notes | Version changelog, migration guides |
| `user-research` | Document user research findings | Personas, journey maps, insights |

**Skill Structure Example**:
```
product/
├── prd-writer/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── prd-template.md
│   │   └── user-story-template.md
│   ├── examples/
│   │   └── sample-prd.md
│   └── reference/
│       ├── acceptance-criteria-guide.md
│       └── prioritization-frameworks.md
```

### 2.4 Software Architecture

**Purpose**: Technical documentation from requirements to detailed design.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `requirements-spec` | Functional & non-functional requirements | FR/NFR specifications, traceability matrix |
| `architecture-design` | System architecture documentation | C4 diagrams, component design, data flow |
| `api-design` | API specification and documentation | OpenAPI specs, endpoint documentation |
| `database-design` | Database schema design | ERD, schema migrations, indexing strategy |
| `security-design` | Security architecture | Threat model, security controls, compliance |
| `service-guide` | Service documentation | Deployment, configuration, operations |

**Skill Structure Example**:
```
architecture/
├── architecture-design/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── architecture-decision-record.md
│   │   ├── c4-context.md
│   │   ├── c4-container.md
│   │   └── c4-component.md
│   ├── reference/
│   │   ├── nfr-checklist.md
│   │   └── security-controls.md
│   └── scripts/
│       └── generate_diagram.py
```

### 2.5 Development

**Purpose**: Implementation support and code quality.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `implementation-spec` | Detailed implementation specifications | Class diagrams, sequence diagrams, pseudocode |
| `code-generator` | Generate boilerplate code | CRUD operations, API endpoints, tests |
| `pr-reviewer` | Review pull requests | Code review comments, suggestions |
| `refactoring-guide` | Guide code refactoring | Refactoring patterns, migration steps |
| `debugging-assistant` | Debug issues systematically | Root cause analysis, fix recommendations |
| `documentation-writer` | Generate code documentation | JSDoc, docstrings, README files |

**Skill Structure Example**:
```
development/
├── code-generator/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── fastapi-endpoint.py
│   │   ├── react-component.tsx
│   │   └── pytest-test.py
│   └── reference/
│       ├── coding-standards.md
│       └── naming-conventions.md
```

### 2.6 QA & Testing

**Purpose**: Comprehensive testing artifacts and automation.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `test-strategy` | Define testing strategy | Test levels, scope, tools, environments |
| `test-plan` | Create test plans | Test cases, data requirements, schedule |
| `test-script-generator` | Generate test scripts | Unit tests, integration tests, E2E tests |
| `test-report` | Generate test reports | Execution summary, defects, coverage |
| `automation-framework` | Set up test automation | Playwright, pytest, Jest configurations |
| `code-quality-audit` | Audit code quality | Linting, complexity, coverage analysis |
| `performance-test` | Performance testing | Load test scripts, benchmark reports |

**Skill Structure Example**:
```
qa/
├── test-strategy/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── test-strategy-template.md
│   │   ├── test-plan-template.md
│   │   └── test-report-template.md
│   ├── reference/
│   │   ├── test-types.md
│   │   └── coverage-guidelines.md
│   └── scripts/
│       ├── generate_test_cases.py
│       └── coverage_report.py
```

### 2.7 Service & Support

**Purpose**: Operational documentation and support workflows.

| Skill | Description | Deliverables |
|-------|-------------|--------------|
| `user-guide` | Create/update user guides | Step-by-step instructions, screenshots |
| `troubleshooting` | Troubleshooting guides | Problem-solution pairs, decision trees |
| `runbook` | Operational runbooks | Incident response, recovery procedures |
| `sla-report` | Generate SLA reports | Uptime, response times, compliance |
| `monitoring-setup` | Configure monitoring | Alerts, dashboards, metrics |
| `knowledge-base` | Maintain knowledge base | FAQs, how-to articles, known issues |

**Skill Structure Example**:
```
support/
├── troubleshooting/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── troubleshooting-guide.md
│   │   └── incident-report.md
│   ├── reference/
│   │   ├── common-errors.md
│   │   └── escalation-matrix.md
│   └── scripts/
│       └── log_analyzer.py
```

---

## 3. Hooks Design

### 3.1 Hook Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Security** | Block dangerous operations | `rm -rf`, path traversal, credential exposure |
| **Compliance** | Enforce data policies | PII detection, NHS data handling, GDPR |
| **Audit** | Log tool usage | All tool calls with timestamps, user context |
| **Quality** | Enforce standards | Code style, documentation requirements |
| **Rate Limit** | Prevent abuse | API calls per minute, file operations |
| **Tenant** | Tenant-specific rules | Custom blocked patterns, allowed tools |

### 3.2 Hook Implementation Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM HOOKS                                      │
│  Always active, cannot be disabled by tenants                               │
│  - Security: Block dangerous bash commands                                  │
│  - Security: Block path traversal                                           │
│  - Audit: Log all tool executions                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TENANT HOOKS                                        │
│  Configurable per tenant                                                    │
│  - Compliance: NHS data handling rules                                      │
│  - Compliance: GDPR data protection                                         │
│  - Quality: Tenant coding standards                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                         PROJECT HOOKS                                       │
│  Configurable per project                                                   │
│  - Quality: Project-specific linting rules                                  │
│  - Rate Limit: Project resource quotas                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Hook Configuration

```python
# hooks_config.py

PLATFORM_HOOKS = {
    "security": {
        "blocked_bash_patterns": [
            "rm -rf /", "sudo rm", "chmod 777 /",
            ":(){:|:&};:", "curl | bash", "wget | sh"
        ],
        "blocked_path_patterns": ["../", "..\\"],
        "enabled": True,  # Cannot be disabled
    },
    "audit": {
        "log_all_tools": True,
        "enabled": True,  # Cannot be disabled
    }
}

TENANT_HOOKS = {
    "nhs-trust-a": {
        "compliance": {
            "detect_nhs_numbers": True,
            "detect_pii": True,
            "block_external_data_transfer": True,
        }
    },
    "enterprise-b": {
        "compliance": {
            "detect_pii": True,
            "gdpr_mode": True,
        }
    }
}
```

---

## 4. Implementation Roadmap

### Phase 1: Core Infrastructure (v0.7.0)

- [ ] Implement three-tier Skills loading
- [ ] Add tenant-level Skills directory support
- [ ] Add project-level Skills directory support
- [ ] Implement Skills override precedence

### Phase 2: Role Skills - Wave 1 (v0.7.1)

- [ ] Sales: `sow-generator`, `proposal-writer`
- [ ] PM: `project-charter`, `status-report`
- [ ] QA: `test-strategy`, `test-plan`

### Phase 3: Role Skills - Wave 2 (v0.7.2)

- [ ] Product: `prd-writer`, `roadmap-planner`
- [ ] Architecture: `requirements-spec`, `architecture-design`
- [ ] Development: `code-generator`, `pr-reviewer`

### Phase 4: Role Skills - Wave 3 (v0.7.3)

- [ ] Support: `user-guide`, `troubleshooting`
- [ ] All roles: Remaining skills

### Phase 5: Advanced Hooks (v0.8.0)

- [ ] Tenant-configurable hooks
- [ ] Compliance hooks (NHS, GDPR)
- [ ] Quality enforcement hooks

---

## 5. Best Practices Summary

Based on Claude Agent SDK documentation:

### 5.1 Skill Authoring

1. **Concise is key** - Only add context Claude doesn't already have
2. **Progressive disclosure** - Keep SKILL.md under 500 lines, split into reference files
3. **Clear descriptions** - Description is critical for skill selection (max 1024 chars)
4. **Template patterns** - Provide strict templates for structured outputs
5. **Workflow checklists** - Break complex tasks into checkable steps
6. **Examples pattern** - Show input/output pairs for quality-dependent outputs

### 5.2 Skill Structure

```
skill-name/
├── SKILL.md              # Main instructions (<500 lines)
├── templates/            # Output templates
├── reference/            # Detailed documentation (loaded as needed)
├── examples/             # Sample inputs/outputs
└── scripts/              # Utility scripts (executed, not loaded)
```

### 5.3 SKILL.md Template

```markdown
---
name: skill-name
description: Brief description of what this Skill does and when to use it.
  Use when the user asks for [specific triggers]. Produces [specific outputs].
allowed-tools: Read, Write, Bash(python scripts/*:*)
user-invocable: true
---

# Skill Name

## Quick Start
[Minimal example to get started]

## Workflow
Copy this checklist and track progress:
```
Task Progress:
- [ ] Step 1: [Description]
- [ ] Step 2: [Description]
- [ ] Step 3: [Description]
```

## Output Template
[Strict template for deliverable]

## Advanced Features
- **Feature A**: See [reference/feature-a.md](reference/feature-a.md)
- **Feature B**: See [reference/feature-b.md](reference/feature-b.md)

## Examples
See [examples/](examples/) for sample outputs.
```

---

## 6. Comparison: Skills vs. Traditional Approach

| Aspect | Traditional | Skills-Based |
|--------|-------------|--------------|
| Knowledge | Hardcoded prompts | Modular, file-based |
| Customization | Code changes | File edits, no deploy |
| Multi-tenant | Complex branching | Tier override |
| Updates | Redeploy | Hot reload |
| Auditability | Logs only | Skills + Hooks |
| Scalability | Limited | 100+ Skills supported |

**Verdict**: Skills architecture is the **correct approach** for an enterprise virtual software house. It provides:
- Role-based specialization
- Tenant customization without code changes
- Compliance enforcement via Hooks
- Scalable knowledge management

---

## 7. Next Steps

1. **Review this design** with stakeholders
2. **Prioritize** which role Skills to implement first
3. **Create sample Skills** for highest-priority roles
4. **Test** with real deliverable generation
5. **Iterate** based on output quality

---

## Appendix A: NHS Trust Tenant Example

```
/workspaces/nhs-trust-a/
├── .claude/
│   └── skills/
│       ├── nhs-bid-response/     # Override platform proposal-writer
│       │   ├── SKILL.md
│       │   └── templates/
│       │       ├── nhs-digital-standards.md
│       │       └── ig-toolkit-reference.md
│       └── nhs-compliance/       # Tenant-specific compliance
│           ├── SKILL.md
│           └── reference/
│               ├── nhs-data-security.md
│               └── dcb0129-compliance.md
└── project-a/
    └── .claude/
        └── skills/
            └── project-conventions/  # Project-specific
                └── SKILL.md
```

---

## Appendix B: Hooks Extension Points

```python
# Future hook extension points

async def pre_tool_use_hook(input_data, tool_use_id, context):
    """
    Extension points:
    1. Security validation (platform - always on)
    2. Compliance checks (tenant - configurable)
    3. Quality gates (project - configurable)
    4. Rate limiting (tenant/project)
    5. Custom tenant rules (tenant)
    """
    pass

async def post_tool_use_hook(input_data, tool_use_id, result, context):
    """
    Extension points:
    1. Audit logging (platform - always on)
    2. Result validation (tenant)
    3. Sensitive data detection (tenant)
    4. Metrics collection (platform)
    """
    pass
```
