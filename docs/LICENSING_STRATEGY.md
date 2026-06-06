# Licensing Strategy for OpenLI Codex

## IP Ownership & Commercial Licensing Guide

**Owner**: Lightweight Integration Ltd, UK  
**Last Updated**: Feb 8, 2026

---

## Table of Contents

1. [Recommended License Model](#1-recommended-license-model)
2. [License Options Comparison](#2-license-options-comparison)
3. [IP Protection Strategies](#3-ip-protection-strategies)
4. [Implementation Steps](#4-implementation-steps)
5. [Sample License Text](#5-sample-license-text)

---

## 1. Recommended License Model

### Dual Licensing (Open Core + Commercial)

For your requirements, I recommend a **Dual Licensing** model with **Revenue-Based Tiers**:

| Tier | Criteria | License | Cost |
|------|----------|---------|------|
| **Community** | Revenue < £250K/year | AGPL-3.0 | Free |
| **SME Sponsor** | Revenue £250K-£2M | Commercial Lite | £500/year |
| **Enterprise** | Revenue > £2M | Commercial Enterprise | Custom pricing |

### Why This Model Works

1. **AGPL-3.0 for Community**
   - Strong copyleft: Any modifications must be shared
   - Network clause: SaaS deployments must share source
   - Protects against "taking without giving back"

2. **Commercial License for Larger Orgs**
   - Removes AGPL obligations
   - Includes support/SLA
   - Generates revenue

---

## 2. License Options Comparison

### Option A: AGPL-3.0 + Commercial (Recommended)

**Pros**:
- Strong IP protection (network copyleft)
- Used by MongoDB, Grafana, Nextcloud
- Forces commercial users to either contribute or pay
- Well-tested legally

**Cons**:
- Some enterprises avoid AGPL entirely
- May reduce adoption

### Option B: BSL (Business Source License)

**Pros**:
- Used by MariaDB, CockroachDB, Sentry
- Converts to open source after time period (e.g., 3 years)
- Clear commercial terms

**Cons**:
- Not OSI-approved "open source"
- More complex to explain

### Option C: Elastic License 2.0 (ELv2)

**Pros**:
- Used by Elastic, Confluent
- Simple terms
- Prevents cloud providers from reselling

**Cons**:
- Not OSI-approved
- Relatively new

### Option D: Commons Clause + Apache/MIT

**Pros**:
- Simple addition to permissive license
- Prevents selling the software

**Cons**:
- Controversial in OSS community
- Legally untested

---

## 3. IP Protection Strategies

### Technical Protections

| Strategy | Implementation | Effectiveness |
|----------|---------------|---------------|
| **Copyright Headers** | Add to all source files | High |
| **License File** | LICENSE in repo root | High |
| **Contributor Agreement** | CLA for external contributors | High |
| **Trademark Registration** | Register "SaaS Codex" | Medium |
| **Code Signing** | Sign releases | Medium |
| **Proprietary Components** | Keep some features closed | High |

### Legal Protections

1. **Copyright Assignment/CLA**
   - All contributors assign copyright to Lightweight Integration Ltd
   - Or grant perpetual license to relicense
   - Required for dual licensing to work

2. **Trademark Protection**
   - Register "OpenLI" and "OpenLI Codex" as trademarks
   - Prevents others from using the name commercially

3. **Patent (Optional)**
   - Consider for novel algorithms
   - Expensive but strong protection

### What You CAN Protect

| Asset | Protection Method |
|-------|-------------------|
| Source code | Copyright + License |
| Brand name | Trademark |
| Documentation | Copyright |
| Algorithms | Patent (optional) |
| Trade secrets | Keep proprietary |

### What You CANNOT Fully Protect

| Asset | Why |
|-------|-----|
| Ideas/concepts | Not copyrightable |
| APIs | Limited protection |
| Functionality | Can be reimplemented |

---

## 4. Implementation Steps

### Step 1: Add Copyright Headers to All Files

```python
# Copyright (c) 2026 Lightweight Integration Ltd
# 
# This file is part of SaaS Codex.
# 
# SaaS Codex is dual-licensed:
# - AGPL-3.0 for organizations with annual revenue below £250,000
# - Commercial license for all other organizations
# 
# See LICENSE file for details.
```

### Step 2: Create LICENSE File

See Section 5 below.

### Step 3: Create Contributor License Agreement (CLA)

Required for all external contributors to sign before PRs are merged.

### Step 4: Add License Check to CI/CD

```yaml
# .github/workflows/license-check.yml
- name: Check license headers
  run: |
    find . -name "*.py" -o -name "*.ts" -o -name "*.tsx" | \
    xargs grep -L "Copyright.*Lightweight Integration Ltd" && exit 1 || exit 0
```

### Step 5: Register Trademark

- Apply to UK IPO for "OpenLI" and "OpenLI Codex" trademarks
- Cost: ~£170-£270 for UK registration
- Consider EU trademark (~€850) for broader protection

---

## 5. Sample License Text

### Main LICENSE File

```
SaaS Codex - Dual License

Copyright (c) 2026 Lightweight Integration Ltd
All rights reserved.

This software is dual-licensed:

1. COMMUNITY LICENSE (AGPL-3.0)
   
   For organizations with annual revenue below £250,000 GBP:
   
   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, version 3.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   GNU Affero General Public License for more details.
   
   You should have received a copy of the GNU Affero General Public License
   along with this program. If not, see <https://www.gnu.org/licenses/>.

2. COMMERCIAL LICENSE
   
   For organizations with annual revenue of £250,000 GBP or above:
   
   A commercial license is required. This license includes:
   - Right to use without AGPL obligations
   - Right to create proprietary derivatives
   - Enterprise support and SLA options
   - Indemnification
   
   Contact: Zhong@li-ai.co.uk
   
   Pricing:
   - SME (£250K - £2M revenue): £500/year
   - Enterprise (> £2M revenue): Contact for quote

TRADEMARK NOTICE

"OpenLI", "OpenLI Codex", and the OpenLI logo are trademarks of 
Lightweight Integration Ltd. Use of these marks requires 
written permission.

CONTRIBUTOR LICENSE AGREEMENT

By contributing to this project, you agree to the Contributor
License Agreement (CLA) which grants Lightweight Integration Ltd
the right to relicense your contributions under any license.
```

### Contributor License Agreement (CLA)

```
CONTRIBUTOR LICENSE AGREEMENT

By submitting a contribution to SaaS Codex, you agree to the following:

1. You grant Lightweight Integration Ltd a perpetual, worldwide, 
   non-exclusive, royalty-free, irrevocable license to use, reproduce,
   modify, display, perform, sublicense, and distribute your contributions.

2. You grant Lightweight Integration Ltd the right to relicense your
   contributions under any license, including proprietary licenses.

3. You represent that you have the legal right to grant these licenses.

4. You understand that your contributions may be used in commercial
   products without compensation.

Signed electronically by submitting a pull request.
```

---

## 6. Comparison with Similar Projects

| Project | License Model | Revenue Model |
|---------|--------------|---------------|
| **MongoDB** | SSPL (similar to AGPL) | Enterprise license |
| **Grafana** | AGPL-3.0 | Enterprise features |
| **GitLab** | MIT (CE) + Proprietary (EE) | Enterprise edition |
| **Nextcloud** | AGPL-3.0 | Enterprise support |
| **Elastic** | Elastic License 2.0 | Enterprise features |
| **Redis** | RSALv2 + SSPLv1 | Enterprise modules |

---

## 7. Recommended Next Steps

1. **Immediate (This Week)**
   - [ ] Add LICENSE file to repository
   - [ ] Add copyright headers to all source files
   - [ ] Update README with license information

2. **Short Term (This Month)**
   - [ ] Create CLA document
   - [ ] Set up CLA bot for GitHub PRs
   - [ ] Register "OpenLI" / "OpenLI Codex" trademarks (UK IPO)

3. **Medium Term (This Quarter)**
   - [ ] Create commercial license agreement template
   - [ ] Set up licensing portal/contact
   - [ ] Consider EU trademark registration

---

## 8. FAQ

**Q: Can someone fork and compete with us?**
A: Under AGPL, yes, but they must:
- Keep it open source
- Share all modifications
- Include the same license
- Cannot use our trademark

**Q: What if a large company uses it without paying?**
A: Under AGPL, if they deploy it as a service, they must share their source code. If they don't want to, they must buy a commercial license.

**Q: Can we change the license later?**
A: Yes, if you own all the copyright (via CLA from contributors). This is why the CLA is essential.

**Q: Is AGPL enforceable?**
A: Yes, it has been enforced in court (e.g., Artifex vs Hancom). The copyleft provisions are legally binding.

---

## Contact

**Lightweight Integration Ltd**  
United Kingdom  
Zhong@li-ai.co.uk
