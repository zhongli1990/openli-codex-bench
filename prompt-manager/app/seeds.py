"""Seed data: platform prompt templates for initial deployment."""

SEED_TEMPLATES = [
    {
        "name": "NHS SoW Generator",
        "description": "Generate a professional Statement of Work for NHS Trust engagements with structured sections for scope, deliverables, timeline, and pricing.",
        "category": "sales",
        "subcategory": "nhs-bid",
        "tags": ["nhs", "sow", "sales", "proposal"],
        "template_body": (
            "Generate a professional Statement of Work for {{customer_name}} ({{customer_type}}).\n\n"
            "Project: {{project_name}}\n"
            "Scope: {{scope_description}}\n"
            "Timeline: {{start_date}} to {{end_date}}\n"
            "Budget: £{{budget}}\n\n"
            "Requirements:\n{{requirements}}\n\n"
            "Please produce a complete SoW document with the following sections:\n"
            "1. Executive Summary\n"
            "2. Scope of Work (In Scope, Out of Scope, Assumptions)\n"
            "3. Deliverables table with acceptance criteria\n"
            "4. Timeline & Milestones\n"
            "5. Pricing & Payment Schedule\n"
            "6. Team & Resources\n"
            "7. Governance & Communication\n"
            "8. Terms & Conditions\n"
            "9. Signatures"
        ),
        "variables": [
            {"name": "customer_name", "type": "string", "description": "NHS Trust or customer name", "required": True},
            {"name": "customer_type", "type": "enum", "description": "Customer type", "options": ["NHS Trust", "Enterprise", "SMB"], "default": "NHS Trust", "required": True},
            {"name": "project_name", "type": "string", "description": "Project name", "required": True},
            {"name": "scope_description", "type": "text", "description": "Brief scope description", "required": True},
            {"name": "start_date", "type": "date", "description": "Project start date", "required": True},
            {"name": "end_date", "type": "date", "description": "Project end date", "required": True},
            {"name": "budget", "type": "number", "description": "Budget in GBP", "required": False},
            {"name": "requirements", "type": "text", "description": "Key requirements (one per line)", "required": True},
        ],
        "sample_values": {
            "customer_name": "NHS Birmingham Trust",
            "customer_type": "NHS Trust",
            "project_name": "TIE Integration Upgrade",
            "scope_description": "Upgrade HL7v2 ADT interfaces to FHIR R4",
            "start_date": "2026-04-01",
            "end_date": "2026-09-30",
            "budget": "150000",
            "requirements": "1. Migrate ADT^A01/A02/A03 to FHIR Patient\n2. Implement FHIR Encounter resources\n3. Maintain backward compatibility",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "Project Charter",
        "description": "Generate a project charter document with objectives, stakeholders, scope, risks, and success criteria.",
        "category": "project-management",
        "subcategory": "charter",
        "tags": ["charter", "project", "initiation"],
        "template_body": (
            "Create a Project Charter for the following project:\n\n"
            "Project Name: {{project_name}}\n"
            "Sponsor: {{sponsor_name}}\n"
            "Project Manager: {{pm_name}}\n"
            "Organisation: {{organisation}}\n\n"
            "Business Case:\n{{business_case}}\n\n"
            "Please include:\n"
            "1. Project Purpose & Justification\n"
            "2. Objectives & Success Criteria\n"
            "3. High-Level Scope\n"
            "4. Key Stakeholders\n"
            "5. Assumptions & Constraints\n"
            "6. Risks & Mitigation\n"
            "7. Budget Summary\n"
            "8. Timeline Overview\n"
            "9. Approval Signatures"
        ),
        "variables": [
            {"name": "project_name", "type": "string", "description": "Project name", "required": True},
            {"name": "sponsor_name", "type": "string", "description": "Executive sponsor", "required": True},
            {"name": "pm_name", "type": "string", "description": "Project manager", "required": True},
            {"name": "organisation", "type": "string", "description": "Organisation name", "required": True},
            {"name": "business_case", "type": "text", "description": "Business case summary", "required": True},
        ],
        "sample_values": {
            "project_name": "FHIR R4 Migration",
            "sponsor_name": "Dr Sarah Johnson",
            "pm_name": "James Wilson",
            "organisation": "NHS Leeds Teaching Hospitals",
            "business_case": "Migrate legacy HL7v2 interfaces to FHIR R4 to improve interoperability and comply with NHS Digital standards.",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "Architecture Decision Record",
        "description": "Create a structured ADR documenting a technical decision with context, options considered, and consequences.",
        "category": "architecture",
        "subcategory": "design",
        "tags": ["adr", "architecture", "decision", "technical"],
        "template_body": (
            "Create an Architecture Decision Record (ADR) for the following decision:\n\n"
            "Title: {{decision_title}}\n"
            "Context: {{context}}\n"
            "Decision Date: {{decision_date}}\n"
            "Deciders: {{deciders}}\n\n"
            "Options Considered:\n{{options}}\n\n"
            "Please produce a complete ADR with:\n"
            "1. Status (Proposed/Accepted/Deprecated/Superseded)\n"
            "2. Context & Problem Statement\n"
            "3. Decision Drivers\n"
            "4. Options Considered (with pros/cons for each)\n"
            "5. Decision Outcome\n"
            "6. Consequences (positive, negative, neutral)\n"
            "7. Related Decisions\n"
            "8. Notes"
        ),
        "variables": [
            {"name": "decision_title", "type": "string", "description": "Short title for the decision", "required": True},
            {"name": "context", "type": "text", "description": "Background context and problem", "required": True},
            {"name": "decision_date", "type": "date", "description": "Date of decision", "required": True},
            {"name": "deciders", "type": "string", "description": "People involved in decision", "required": True},
            {"name": "options", "type": "text", "description": "Options considered (one per line)", "required": True},
        ],
        "sample_values": {
            "decision_title": "Use FHIR R4 over HL7v2 for new interfaces",
            "context": "The trust needs to build new patient data interfaces. We need to decide between continuing with HL7v2 or adopting FHIR R4.",
            "decision_date": "2026-02-09",
            "deciders": "CTO, Lead Architect, Integration Team Lead",
            "options": "1. Continue with HL7v2\n2. Adopt FHIR R4 for new interfaces only\n3. Full migration to FHIR R4",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "Code Review Checklist",
        "description": "Generate a structured code review checklist tailored to a specific language, framework, and review focus area.",
        "category": "development",
        "subcategory": "review",
        "tags": ["code-review", "quality", "checklist"],
        "template_body": (
            "Generate a comprehensive code review checklist for:\n\n"
            "Language: {{language}}\n"
            "Framework: {{framework}}\n"
            "Focus Area: {{focus_area}}\n"
            "PR Description: {{pr_description}}\n\n"
            "Please include checks for:\n"
            "1. Code correctness and logic\n"
            "2. Error handling and edge cases\n"
            "3. Security considerations\n"
            "4. Performance implications\n"
            "5. Code style and readability\n"
            "6. Test coverage\n"
            "7. Documentation\n"
            "8. Framework-specific best practices"
        ),
        "variables": [
            {"name": "language", "type": "enum", "description": "Programming language", "options": ["Python", "TypeScript", "Java", "C#", "Go", "Rust"], "default": "Python", "required": True},
            {"name": "framework", "type": "string", "description": "Framework or library", "required": True},
            {"name": "focus_area", "type": "enum", "description": "Primary review focus", "options": ["Security", "Performance", "Correctness", "Maintainability", "All"], "default": "All", "required": True},
            {"name": "pr_description", "type": "text", "description": "What the PR does", "required": True},
        ],
        "sample_values": {
            "language": "Python",
            "framework": "FastAPI",
            "focus_area": "Security",
            "pr_description": "Add JWT authentication middleware and user registration endpoint",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet", "codex"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "Test Strategy Document",
        "description": "Generate a test strategy document covering test levels, types, tools, environments, and entry/exit criteria.",
        "category": "qa",
        "subcategory": "strategy",
        "tags": ["testing", "qa", "strategy", "plan"],
        "template_body": (
            "Create a Test Strategy document for:\n\n"
            "Project: {{project_name}}\n"
            "System Type: {{system_type}}\n"
            "Tech Stack: {{tech_stack}}\n"
            "Compliance Requirements: {{compliance}}\n\n"
            "Key Features to Test:\n{{features}}\n\n"
            "Please include:\n"
            "1. Test Objectives\n"
            "2. Scope (In/Out of scope)\n"
            "3. Test Levels (Unit, Integration, System, UAT)\n"
            "4. Test Types (Functional, Performance, Security, Accessibility)\n"
            "5. Test Environment Requirements\n"
            "6. Test Data Strategy\n"
            "7. Tools & Frameworks\n"
            "8. Entry & Exit Criteria\n"
            "9. Defect Management\n"
            "10. Risks & Mitigations\n"
            "11. Schedule & Milestones"
        ),
        "variables": [
            {"name": "project_name", "type": "string", "description": "Project name", "required": True},
            {"name": "system_type", "type": "enum", "description": "Type of system", "options": ["Web Application", "API Service", "Mobile App", "Integration Platform", "Data Pipeline"], "default": "Web Application", "required": True},
            {"name": "tech_stack", "type": "string", "description": "Technology stack", "required": True},
            {"name": "compliance", "type": "string", "description": "Compliance requirements (e.g. NHS Digital, GDPR)", "required": False},
            {"name": "features", "type": "text", "description": "Key features to test (one per line)", "required": True},
        ],
        "sample_values": {
            "project_name": "OpenLI Codex Platform",
            "system_type": "Web Application",
            "tech_stack": "Next.js, FastAPI, PostgreSQL, Docker",
            "compliance": "NHS Digital, GDPR, DCB0129",
            "features": "1. User authentication and RBAC\n2. Agent console with streaming\n3. Workspace management\n4. Prompt template rendering\n5. Skills management",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "PRD Writer",
        "description": "Generate a Product Requirements Document with user stories, acceptance criteria, and technical constraints.",
        "category": "product",
        "subcategory": "prd",
        "tags": ["prd", "product", "requirements"],
        "template_body": (
            "Write a Product Requirements Document (PRD) for:\n\n"
            "Feature: {{feature_name}}\n"
            "Product: {{product_name}}\n"
            "Target Users: {{target_users}}\n"
            "Priority: {{priority}}\n\n"
            "Problem Statement:\n{{problem_statement}}\n\n"
            "Proposed Solution:\n{{proposed_solution}}\n\n"
            "Please include:\n"
            "1. Overview & Background\n"
            "2. Goals & Non-Goals\n"
            "3. User Stories with acceptance criteria\n"
            "4. Functional Requirements\n"
            "5. Non-Functional Requirements (performance, security, scalability)\n"
            "6. UI/UX Requirements\n"
            "7. Technical Constraints\n"
            "8. Dependencies\n"
            "9. Success Metrics\n"
            "10. Timeline & Milestones\n"
            "11. Open Questions"
        ),
        "variables": [
            {"name": "feature_name", "type": "string", "description": "Feature or epic name", "required": True},
            {"name": "product_name", "type": "string", "description": "Product name", "required": True},
            {"name": "target_users", "type": "string", "description": "Target user personas", "required": True},
            {"name": "priority", "type": "enum", "description": "Priority level", "options": ["Critical", "High", "Medium", "Low"], "default": "High", "required": True},
            {"name": "problem_statement", "type": "text", "description": "What problem does this solve?", "required": True},
            {"name": "proposed_solution", "type": "text", "description": "High-level proposed solution", "required": True},
        ],
        "sample_values": {
            "feature_name": "Prompt Template Manager",
            "product_name": "OpenLI Codex",
            "target_users": "Integration Engineers, Solution Architects, Project Managers",
            "priority": "High",
            "problem_statement": "Users repeatedly type similar prompts for common tasks. There is no way to share proven prompt patterns across teams.",
            "proposed_solution": "A prompt template library with parameterised templates, versioning, and team sharing capabilities.",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "User Guide Generator",
        "description": "Generate end-user documentation for a feature or system with step-by-step instructions and screenshots placeholders.",
        "category": "support",
        "subcategory": "user-guide",
        "tags": ["documentation", "user-guide", "support"],
        "template_body": (
            "Write a User Guide for:\n\n"
            "Feature: {{feature_name}}\n"
            "Product: {{product_name}}\n"
            "Audience: {{audience}}\n"
            "Skill Level: {{skill_level}}\n\n"
            "Feature Description:\n{{feature_description}}\n\n"
            "Please include:\n"
            "1. Introduction & Purpose\n"
            "2. Prerequisites\n"
            "3. Getting Started (step-by-step with [Screenshot] placeholders)\n"
            "4. Common Tasks & Workflows\n"
            "5. Tips & Best Practices\n"
            "6. Troubleshooting & FAQ\n"
            "7. Glossary of Terms"
        ),
        "variables": [
            {"name": "feature_name", "type": "string", "description": "Feature name", "required": True},
            {"name": "product_name", "type": "string", "description": "Product name", "required": True},
            {"name": "audience", "type": "string", "description": "Target audience", "required": True},
            {"name": "skill_level", "type": "enum", "description": "Technical skill level", "options": ["Non-technical", "Basic", "Intermediate", "Advanced"], "default": "Basic", "required": True},
            {"name": "feature_description", "type": "text", "description": "What the feature does", "required": True},
        ],
        "sample_values": {
            "feature_name": "Prompt Templates",
            "product_name": "OpenLI Codex",
            "audience": "Clinical Informaticists",
            "skill_level": "Non-technical",
            "feature_description": "Prompt Templates allow users to select pre-built prompt patterns, fill in variables, and send them to the AI agent for execution.",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "NHS Compliance Audit",
        "description": "Generate an NHS Digital compliance audit checklist for a healthcare integration system.",
        "category": "compliance",
        "subcategory": "nhs",
        "tags": ["nhs", "compliance", "audit", "healthcare"],
        "template_body": (
            "Perform an NHS Digital compliance audit for:\n\n"
            "System: {{system_name}}\n"
            "Integration Type: {{integration_type}}\n"
            "Data Types Handled: {{data_types}}\n"
            "Deployment Environment: {{environment}}\n\n"
            "Please audit against:\n"
            "1. NHS Digital Standards (DCB0129, DCB0160)\n"
            "2. Information Governance Toolkit\n"
            "3. Data Security and Protection Toolkit (DSPT)\n"
            "4. FHIR UK Core compliance (if applicable)\n"
            "5. HL7v2 UK extensions (if applicable)\n"
            "6. Clinical Safety (DCB0129 / DCB0160)\n"
            "7. GDPR / UK Data Protection Act 2018\n"
            "8. Cyber Essentials Plus requirements\n"
            "9. Access Control and Authentication\n"
            "10. Audit Logging and Monitoring\n\n"
            "For each area, provide: Status (Compliant/Partial/Non-Compliant), Findings, and Recommendations."
        ),
        "variables": [
            {"name": "system_name", "type": "string", "description": "System or service name", "required": True},
            {"name": "integration_type", "type": "enum", "description": "Type of integration", "options": ["HL7v2", "FHIR R4", "X12", "Custom API", "Mixed"], "default": "FHIR R4", "required": True},
            {"name": "data_types", "type": "string", "description": "Types of data handled (e.g. PID, clinical, admin)", "required": True},
            {"name": "environment", "type": "enum", "description": "Deployment environment", "options": ["NHS N3/HSCN", "Cloud (NHS approved)", "On-premise", "Hybrid"], "default": "Cloud (NHS approved)", "required": True},
        ],
        "sample_values": {
            "system_name": "Trust Integration Engine",
            "integration_type": "Mixed",
            "data_types": "Patient demographics (PID), clinical observations, lab results, discharge summaries",
            "environment": "Hybrid",
        },
        "compatible_models": ["claude-sonnet-4"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "Weekly Status Report",
        "description": "Generate a structured weekly status report with RAG ratings, accomplishments, risks, and next steps.",
        "category": "project-management",
        "subcategory": "status",
        "tags": ["status", "report", "weekly", "rag"],
        "template_body": (
            "Generate a Weekly Status Report:\n\n"
            "Project: {{project_name}}\n"
            "Reporting Period: {{period_start}} to {{period_end}}\n"
            "Overall RAG: {{rag_status}}\n"
            "Project Manager: {{pm_name}}\n\n"
            "Accomplishments This Week:\n{{accomplishments}}\n\n"
            "Planned for Next Week:\n{{planned_next}}\n\n"
            "Risks/Issues:\n{{risks}}\n\n"
            "Please format as a professional status report with:\n"
            "1. Executive Summary (2-3 sentences)\n"
            "2. RAG Dashboard (Schedule, Budget, Scope, Quality)\n"
            "3. Key Accomplishments\n"
            "4. Upcoming Milestones\n"
            "5. Risks & Issues (with owner and mitigation)\n"
            "6. Decisions Required\n"
            "7. Resource Updates"
        ),
        "variables": [
            {"name": "project_name", "type": "string", "description": "Project name", "required": True},
            {"name": "period_start", "type": "date", "description": "Week start date", "required": True},
            {"name": "period_end", "type": "date", "description": "Week end date", "required": True},
            {"name": "rag_status", "type": "enum", "description": "Overall RAG status", "options": ["Green", "Amber", "Red"], "default": "Green", "required": True},
            {"name": "pm_name", "type": "string", "description": "Project manager name", "required": True},
            {"name": "accomplishments", "type": "text", "description": "What was completed this week", "required": True},
            {"name": "planned_next", "type": "text", "description": "What is planned for next week", "required": True},
            {"name": "risks", "type": "text", "description": "Current risks and issues", "required": False},
        ],
        "sample_values": {
            "project_name": "FHIR R4 Migration",
            "period_start": "2026-02-03",
            "period_end": "2026-02-07",
            "rag_status": "Amber",
            "pm_name": "James Wilson",
            "accomplishments": "1. Completed ADT^A01 to FHIR Patient mapping\n2. Set up test environment\n3. Drafted integration test plan",
            "planned_next": "1. Implement ADT^A02/A03 mappings\n2. Begin integration testing\n3. Review with clinical team",
            "risks": "1. Test data availability delayed - mitigation: using synthetic data\n2. Clinical team availability limited next week",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
    {
        "name": "API Design Specification",
        "description": "Generate an API design specification with endpoints, request/response schemas, authentication, and error handling.",
        "category": "architecture",
        "subcategory": "api-design",
        "tags": ["api", "design", "specification", "rest"],
        "template_body": (
            "Design a REST API specification for:\n\n"
            "Service: {{service_name}}\n"
            "Purpose: {{purpose}}\n"
            "Auth Method: {{auth_method}}\n"
            "API Style: {{api_style}}\n\n"
            "Resources/Entities:\n{{resources}}\n\n"
            "Please produce a complete API specification with:\n"
            "1. Overview & Base URL\n"
            "2. Authentication & Authorization\n"
            "3. Endpoints (for each resource: GET list, GET by ID, POST, PUT, DELETE)\n"
            "4. Request/Response schemas (JSON examples)\n"
            "5. Pagination, Filtering, Sorting\n"
            "6. Error Response Format (with HTTP status codes)\n"
            "7. Rate Limiting\n"
            "8. Versioning Strategy\n"
            "9. OpenAPI/Swagger snippet"
        ),
        "variables": [
            {"name": "service_name", "type": "string", "description": "Service or API name", "required": True},
            {"name": "purpose", "type": "text", "description": "What the API does", "required": True},
            {"name": "auth_method", "type": "enum", "description": "Authentication method", "options": ["JWT Bearer", "API Key", "OAuth2", "None"], "default": "JWT Bearer", "required": True},
            {"name": "api_style", "type": "enum", "description": "API style", "options": ["REST", "GraphQL", "gRPC"], "default": "REST", "required": True},
            {"name": "resources", "type": "text", "description": "Resources/entities to expose (one per line)", "required": True},
        ],
        "sample_values": {
            "service_name": "Prompt Manager API",
            "purpose": "CRUD operations for parameterised prompt templates with versioning and multi-tenant support",
            "auth_method": "JWT Bearer",
            "api_style": "REST",
            "resources": "1. Prompt Templates (CRUD, render, publish, clone)\n2. Skills (CRUD, toggle, sync)\n3. Categories (list with counts)\n4. Usage Analytics (log, stats)",
        },
        "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
        "recommended_model": "claude-sonnet-4",
        "visibility": "public",
        "status": "published",
    },
]
