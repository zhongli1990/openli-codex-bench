---
name: architecture-design
description: Create comprehensive software architecture documentation including C4 diagrams, component design, and technical specifications. Use when the user asks for architecture design, system design, technical architecture, or component diagrams. Produces structured architecture documents with context, containers, components, and deployment views.
allowed-tools: Read, Write, Grep
user-invocable: true
---

# Architecture Design Generator

## Quick Start

To generate architecture documentation, provide:
1. System name and purpose
2. Key functional requirements
3. Non-functional requirements (performance, security, scalability)
4. Integration points (external systems)
5. Technology constraints (if any)

## Workflow

Copy this checklist and track progress:
```
Architecture Design Progress:
- [ ] Step 1: Understand business context and requirements
- [ ] Step 2: Identify key stakeholders and concerns
- [ ] Step 3: Create C4 Context diagram
- [ ] Step 4: Create C4 Container diagram
- [ ] Step 5: Create C4 Component diagrams (key containers)
- [ ] Step 6: Document data architecture
- [ ] Step 7: Address non-functional requirements
- [ ] Step 8: Create deployment architecture
- [ ] Step 9: Document Architecture Decision Records (ADRs)
- [ ] Step 10: Review and finalize
```

## Output Template

ALWAYS use this exact structure:

```markdown
# Architecture Design Document

**System**: [System Name]
**Version**: 1.0
**Date**: [DATE]
**Author**: [Author]
**Status**: Draft

---

## 1. Introduction

### 1.1 Purpose
This document describes the software architecture for [System Name].

### 1.2 Scope
[What this architecture covers]

### 1.3 Definitions & Acronyms
| Term | Definition |
|------|------------|
| [Term] | [Definition] |

### 1.4 References
| Document | Version | Location |
|----------|---------|----------|
| Requirements Spec | [Ver] | [Link] |
| Product Requirements | [Ver] | [Link] |

---

## 2. Architecture Overview

### 2.1 Business Context
[Brief description of the business problem being solved]

### 2.2 Solution Overview
[High-level description of the solution]

### 2.3 Key Architecture Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| [Decision 1] | [Why] | [Alternatives] |
| [Decision 2] | [Why] | [Alternatives] |

---

## 3. C4 Model

### 3.1 Level 1: System Context

```mermaid
C4Context
    title System Context Diagram - [System Name]
    
    Person(user, "User", "Description of user")
    System(system, "System Name", "Description of system")
    System_Ext(ext1, "External System 1", "Description")
    System_Ext(ext2, "External System 2", "Description")
    
    Rel(user, system, "Uses")
    Rel(system, ext1, "Integrates with")
    Rel(system, ext2, "Sends data to")
```

**Context Description**:
| Element | Description | Technology |
|---------|-------------|------------|
| [System] | [Description] | [Tech] |
| [External 1] | [Description] | [Tech] |

### 3.2 Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - [System Name]
    
    Person(user, "User", "Description")
    
    Container_Boundary(system, "System Name") {
        Container(web, "Web Application", "React", "User interface")
        Container(api, "API Server", "FastAPI", "Business logic")
        Container(db, "Database", "PostgreSQL", "Data storage")
        Container(cache, "Cache", "Redis", "Session/cache")
    }
    
    System_Ext(ext, "External System", "Description")
    
    Rel(user, web, "Uses", "HTTPS")
    Rel(web, api, "Calls", "REST/JSON")
    Rel(api, db, "Reads/Writes", "SQL")
    Rel(api, cache, "Caches", "Redis protocol")
    Rel(api, ext, "Integrates", "REST")
```

**Container Descriptions**:
| Container | Description | Technology | Responsibilities |
|-----------|-------------|------------|------------------|
| Web App | User interface | React, TypeScript | UI rendering, user interaction |
| API Server | Backend services | FastAPI, Python | Business logic, data access |
| Database | Persistent storage | PostgreSQL | Data persistence |
| Cache | Caching layer | Redis | Session management, caching |

### 3.3 Level 3: Component Diagram

```mermaid
C4Component
    title Component Diagram - API Server
    
    Container_Boundary(api, "API Server") {
        Component(auth, "Auth Module", "Python", "Authentication & authorization")
        Component(users, "User Service", "Python", "User management")
        Component(core, "Core Service", "Python", "Business logic")
        Component(data, "Data Access", "SQLAlchemy", "Database operations")
    }
    
    ContainerDb(db, "Database", "PostgreSQL")
    
    Rel(auth, users, "Uses")
    Rel(users, data, "Uses")
    Rel(core, data, "Uses")
    Rel(data, db, "Reads/Writes")
```

**Component Descriptions**:
| Component | Description | Responsibilities |
|-----------|-------------|------------------|
| Auth Module | Authentication | JWT validation, RBAC |
| User Service | User management | CRUD operations |
| Core Service | Business logic | Domain operations |
| Data Access | Database layer | ORM, queries |

---

## 4. Data Architecture

### 4.1 Data Model

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ WORKSPACE : owns
    WORKSPACE ||--o{ PROJECT : contains
    
    USER {
        uuid id PK
        string email
        string name
        timestamp created_at
    }
    
    WORKSPACE {
        uuid id PK
        uuid owner_id FK
        string name
        timestamp created_at
    }
```

### 4.2 Data Flow

```mermaid
flowchart LR
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Core Service]
    D --> E[(Database)]
    D --> F[(Cache)]
```

### 4.3 Data Storage

| Data Type | Storage | Retention | Backup |
|-----------|---------|-----------|--------|
| User data | PostgreSQL | Indefinite | Daily |
| Sessions | Redis | 24 hours | None |
| Logs | Elasticsearch | 90 days | Weekly |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response time (P95) | < 200ms | APM monitoring |
| Throughput | 1000 req/s | Load testing |
| Availability | 99.9% | Uptime monitoring |

### 5.2 Scalability

| Dimension | Strategy |
|-----------|----------|
| Horizontal | Container orchestration (Kubernetes) |
| Vertical | Resource limits per container |
| Data | Read replicas, sharding |

### 5.3 Security

| Control | Implementation |
|---------|----------------|
| Authentication | JWT tokens, OAuth 2.0 |
| Authorization | RBAC with permissions |
| Encryption | TLS 1.3 in transit, AES-256 at rest |
| Audit | All API calls logged |

### 5.4 Reliability

| Aspect | Strategy |
|--------|----------|
| Fault tolerance | Circuit breakers, retries |
| Disaster recovery | Multi-AZ deployment |
| Backup | Daily automated backups |

---

## 6. Deployment Architecture

### 6.1 Deployment Diagram

```mermaid
flowchart TB
    subgraph Cloud["Cloud Provider"]
        subgraph LB["Load Balancer"]
            ALB[Application LB]
        end
        
        subgraph K8s["Kubernetes Cluster"]
            subgraph Web["Web Tier"]
                W1[Web Pod 1]
                W2[Web Pod 2]
            end
            
            subgraph API["API Tier"]
                A1[API Pod 1]
                A2[API Pod 2]
            end
        end
        
        subgraph Data["Data Tier"]
            DB[(PostgreSQL)]
            Cache[(Redis)]
        end
    end
    
    ALB --> W1 & W2
    W1 & W2 --> A1 & A2
    A1 & A2 --> DB & Cache
```

### 6.2 Environment Configuration

| Environment | Purpose | Scaling | Data |
|-------------|---------|---------|------|
| Development | Dev testing | 1 replica | Synthetic |
| Staging | Pre-prod | 2 replicas | Anonymized |
| Production | Live | Auto-scale | Real |

---

## 7. Integration Architecture

### 7.1 External Integrations

| System | Protocol | Authentication | Purpose |
|--------|----------|----------------|---------|
| [System 1] | REST | API Key | [Purpose] |
| [System 2] | GraphQL | OAuth 2.0 | [Purpose] |

### 7.2 API Design

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v1/users | GET | List users |
| /api/v1/users/{id} | GET | Get user |
| /api/v1/users | POST | Create user |

---

## 8. Architecture Decision Records

### ADR-001: [Decision Title]

**Status**: Accepted  
**Date**: [Date]

**Context**: [Why this decision was needed]

**Decision**: [What was decided]

**Consequences**:
- Positive: [Benefits]
- Negative: [Tradeoffs]

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | Medium | High | [Mitigation] |
| [Risk 2] | Low | Medium | [Mitigation] |

---

## 10. Appendices

### A. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React | 18.x | UI framework |
| Backend | FastAPI | 0.100+ | API framework |
| Database | PostgreSQL | 15.x | Primary database |
| Cache | Redis | 7.x | Caching |

### B. Glossary

| Term | Definition |
|------|------------|
| [Term] | [Definition] |
```

## References

- **C4 Model**: See [reference/c4-model-guide.md](reference/c4-model-guide.md)
- **NFR Checklist**: See [reference/nfr-checklist.md](reference/nfr-checklist.md)
- **ADR Template**: See [reference/adr-template.md](reference/adr-template.md)
