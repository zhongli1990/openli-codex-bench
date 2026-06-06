---
name: user-guide
description: Create and update user guide documentation for software products. Use when the user asks for user guide, user manual, help documentation, or end-user documentation. Produces structured user guides with getting started, features, troubleshooting, and FAQs.
allowed-tools: Read, Write, Grep
user-invocable: true
---

# User Guide Generator

## Quick Start

To generate a User Guide, provide:
1. Product/feature name
2. Target audience (technical level)
3. Key features to document
4. Common tasks users need to perform

## Workflow

Copy this checklist and track progress:
```
User Guide Progress:
- [ ] Step 1: Identify target audience and their needs
- [ ] Step 2: Create getting started section
- [ ] Step 3: Document key features
- [ ] Step 4: Write step-by-step procedures
- [ ] Step 5: Add screenshots/diagrams
- [ ] Step 6: Create troubleshooting section
- [ ] Step 7: Compile FAQs
- [ ] Step 8: Review for clarity and completeness
```

## Output Template

ALWAYS use this exact structure:

```markdown
# [Product Name] User Guide

**Version**: [X.Y.Z]
**Last Updated**: [DATE]
**Audience**: [End Users / Administrators / Developers]

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Features](#3-features)
4. [How-To Guides](#4-how-to-guides)
5. [Troubleshooting](#5-troubleshooting)
6. [FAQs](#6-faqs)
7. [Support](#7-support)

---

## 1. Introduction

### 1.1 About [Product Name]
[Brief description of what the product does and its key benefits]

### 1.2 Who Should Use This Guide
This guide is intended for:
- [User type 1]: [What they'll learn]
- [User type 2]: [What they'll learn]

### 1.3 Prerequisites
Before using [Product Name], ensure you have:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

### 1.4 Key Terminology

| Term | Definition |
|------|------------|
| [Term 1] | [Definition] |
| [Term 2] | [Definition] |

---

## 2. Getting Started

### 2.1 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Browser | Chrome 90+ | Chrome latest |
| Screen | 1280x720 | 1920x1080 |
| Network | 1 Mbps | 10 Mbps |

### 2.2 Accessing [Product Name]

1. Open your web browser
2. Navigate to `[URL]`
3. Enter your credentials
4. Click **Login**

### 2.3 First-Time Setup

#### Step 1: Complete Your Profile
1. Click your avatar in the top-right corner
2. Select **Profile Settings**
3. Fill in required fields
4. Click **Save**

#### Step 2: Configure Preferences
1. Navigate to **Settings** > **Preferences**
2. Set your timezone
3. Choose notification preferences
4. Click **Apply**

### 2.4 Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    Navigation Menu                    User | Settings │
├─────────────────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │              Main Content Area                   │
│          │                                                  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│                        Footer                               │
└─────────────────────────────────────────────────────────────┘
```

| Area | Description |
|------|-------------|
| Navigation Menu | Access main features |
| Sidebar | Quick actions and filters |
| Main Content | Primary workspace |

---

## 3. Features

### 3.1 [Feature 1 Name]

**Purpose**: [What this feature does]

**How to Access**: Navigate to **[Menu]** > **[Submenu]**

**Key Capabilities**:
- [Capability 1]
- [Capability 2]

### 3.2 [Feature 2 Name]

**Purpose**: [What this feature does]

**How to Access**: Navigate to **[Menu]** > **[Submenu]**

---

## 4. How-To Guides

### 4.1 How to [Common Task 1]

**Estimated Time**: [X] minutes

**Prerequisites**:
- [Prerequisite]

**Steps**:

1. **Navigate to the feature**
   - Click **[Menu]** in the navigation bar
   - Select **[Option]**

2. **Configure settings**
   - Enter [field name]: `[example value]`
   - Select [option] from dropdown

3. **Complete the action**
   - Review your entries
   - Click **Submit**

**Result**: [What happens when successful]

> **Tip**: [Helpful tip for this task]

### 4.2 How to [Common Task 2]

**Estimated Time**: [X] minutes

**Steps**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

> **Warning**: [Important warning if applicable]

---

## 5. Troubleshooting

### 5.1 Common Issues

#### Issue: [Problem Description]

**Symptoms**:
- [Symptom 1]
- [Symptom 2]

**Cause**: [Why this happens]

**Solution**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

#### Issue: [Problem Description]

**Symptoms**:
- [Symptom]

**Cause**: [Why this happens]

**Solution**:
[Solution steps]

### 5.2 Error Messages

| Error Code | Message | Solution |
|------------|---------|----------|
| ERR-001 | [Message] | [Solution] |
| ERR-002 | [Message] | [Solution] |

### 5.3 Performance Issues

**Slow Loading**:
1. Clear browser cache
2. Check internet connection
3. Try a different browser

---

## 6. FAQs

### General

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page and follow the email instructions.

**Q: Can I use [Product] on mobile?**
A: Yes, [Product] is responsive and works on mobile browsers.

### Features

**Q: [Common question about feature]?**
A: [Answer]

**Q: [Common question about feature]?**
A: [Answer]

### Account & Billing

**Q: How do I upgrade my account?**
A: Navigate to **Settings** > **Subscription** and select your desired plan.

---

## 7. Support

### 7.1 Getting Help

| Channel | Best For | Response Time |
|---------|----------|---------------|
| Help Center | Self-service | Immediate |
| Email | Non-urgent issues | 24-48 hours |
| Live Chat | Urgent issues | < 5 minutes |
| Phone | Critical issues | Immediate |

### 7.2 Contact Information

- **Email**: support@example.com
- **Phone**: +44 (0) 123 456 7890
- **Hours**: Monday-Friday, 9am-5pm GMT

### 7.3 Feedback

We value your feedback! Submit suggestions via:
- In-app feedback button
- Email: feedback@example.com

---

## Appendix

### A. Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Save | Ctrl+S | Cmd+S |
| Search | Ctrl+K | Cmd+K |
| Help | F1 | F1 |

### B. Glossary

| Term | Definition |
|------|------------|
| [Term] | [Definition] |

### C. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Date] | Initial release |
```

## Style Guidelines

- Use **bold** for UI elements (buttons, menus)
- Use `code` for user input values
- Use numbered lists for sequential steps
- Use bullet points for non-sequential items
- Include screenshots for complex procedures
- Keep sentences short and action-oriented
