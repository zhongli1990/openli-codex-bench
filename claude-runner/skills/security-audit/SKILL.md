---
name: security-audit
description: Perform security vulnerability scanning and audit. Use when checking for security issues, vulnerabilities, or compliance with security standards.
allowed-tools: Read, Grep, Glob, Bash
---

# Security Audit Skill

When performing a security audit, systematically check for these vulnerability categories:

## 1. Authentication & Authorization
- [ ] Strong password policies enforced
- [ ] Multi-factor authentication available
- [ ] Session management is secure (timeout, invalidation)
- [ ] JWT tokens properly validated and expired
- [ ] Role-based access control implemented correctly
- [ ] No privilege escalation vulnerabilities

## 2. Injection Vulnerabilities
- [ ] SQL Injection: All queries parameterized
- [ ] XSS: Output encoding applied
- [ ] Command Injection: Shell commands sanitized
- [ ] LDAP Injection: Queries escaped
- [ ] XML/XXE: External entities disabled

## 3. Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] TLS/HTTPS for data in transit
- [ ] PII properly handled and masked in logs
- [ ] Secrets not in source code or config files
- [ ] Proper key management

## 4. Configuration Security
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary services disabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS properly restricted

## 5. Dependency Security
- [ ] No known vulnerable dependencies
- [ ] Dependencies from trusted sources
- [ ] Lock files present and up to date

## Scanning Commands

Use these commands to help identify issues:

```bash
# Find hardcoded secrets
grep -rn "password\|secret\|api_key\|apikey\|token" --include="*.py" --include="*.js" --include="*.ts" --include="*.env"

# Find SQL injection risks
grep -rn "execute\|cursor\|query" --include="*.py" | grep -v "parameterized\|%s\|?"

# Find eval/exec usage
grep -rn "eval\|exec\|subprocess.call\|os.system" --include="*.py"
```

## Output Format

### 🚨 CRITICAL VULNERABILITY
Immediate action required - active exploitation risk

### ⚠️ HIGH RISK
Should be fixed before next release

### 🔶 MEDIUM RISK
Should be addressed in near term

### 📋 LOW RISK / INFORMATIONAL
Best practice recommendations
