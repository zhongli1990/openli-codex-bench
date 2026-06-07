---
name: healthcare-compliance
description: Check code for NHS/healthcare data compliance. Use when working with patient data, medical records, healthcare systems, or NHS integrations.
allowed-tools: Read, Grep, Glob
---

# Healthcare Compliance Skill

When reviewing healthcare-related code, verify compliance with UK NHS and healthcare data regulations.

## 1. Data Protection (UK GDPR / Data Protection Act 2018)

- [ ] Personal Identifiable Information (PII) encrypted at rest
- [ ] PII encrypted in transit (TLS 1.2+)
- [ ] Data minimization - only collect necessary data
- [ ] Purpose limitation - data used only for stated purposes
- [ ] Retention policies implemented and enforced
- [ ] Right to erasure (deletion) supported
- [ ] Consent mechanisms properly implemented
- [ ] Data Processing Agreements in place for third parties

## 2. NHS Specific Requirements

### NHS Number Handling
- [ ] NHS numbers validated (check digit algorithm)
- [ ] NHS numbers not used as primary keys in logs
- [ ] NHS numbers masked in error messages and logs

### Spine Integration
- [ ] Smartcard authentication for Spine access
- [ ] Role-Based Access Control (RBAC) aligned with NHS roles
- [ ] Audit trail for all Spine transactions
- [ ] HL7 FHIR compliance for data exchange

### Clinical Safety (DCB0129 / DCB0160)
- [ ] Clinical risk management process documented
- [ ] Hazard log maintained
- [ ] Clinical safety case report available
- [ ] Change impact assessment for clinical functions

## 3. Audit Trail Requirements

- [ ] All data access logged with timestamp
- [ ] User identity captured for all actions
- [ ] Audit logs immutable (append-only)
- [ ] Audit logs retained for minimum 8 years
- [ ] Break-glass access logged and alerted

## 4. Access Control

- [ ] Legitimate relationship checks implemented
- [ ] Patient consent flags respected
- [ ] Sensitive data flags (e.g., sexual health) handled
- [ ] Staff access limited to care setting
- [ ] Emergency access (break-glass) procedures

## 5. Data Quality

- [ ] Validation of clinical codes (SNOMED CT, ICD-10)
- [ ] Date/time formats standardized (ISO 8601)
- [ ] Character encoding UTF-8 for all text
- [ ] Null handling for optional clinical fields

## Compliance Scanning

```bash
# Find potential PII exposure
grep -rn "nhs_number\|patient_id\|date_of_birth\|postcode" --include="*.py" --include="*.ts"

# Check for logging of sensitive data
grep -rn "logger\|console.log\|print" --include="*.py" --include="*.ts" | grep -i "patient\|nhs\|medical"

# Find unencrypted storage
grep -rn "open(\|write(\|save(" --include="*.py" | grep -v "encrypt\|cipher"
```

## Output Format

### 🏥 COMPLIANCE RISK
Regulatory violation - must be addressed immediately

### ⚠️ CLINICAL SAFETY CONCERN
Potential patient safety impact - requires clinical review

### 📋 BEST PRACTICE
Recommended improvement for healthcare systems

### ✅ COMPLIANT
Meets NHS/healthcare standards
