# OpenAI Integration Security Documentation

## Pseudonymization Logic

This document explains how PII (Personally Identifiable Information) is sanitized before being sent to OpenAI.

### Principles

1. **No Raw PII**: Never send raw Aadhaar numbers, names, addresses, phone numbers, or email addresses
2. **Stable Identifiers**: Use hashed IDs for consistent pseudonymization
3. **Aggregated Data Only**: Send counts, categories, and metrics - not individual records
4. **Age Ranges**: Convert exact DOB to age ranges (e.g., "30-39")

### Sanitization Rules

#### Aadhaar Numbers
- **Input**: `123456789012`
- **Output**: `XXXX-XXXX-9012` (last 4 digits only)
- **Method**: `maskAadhaar()` in `sanitizer.js`

#### Email Addresses
- **Input**: `john.doe@example.com`
- **Output**: `user@example.com`
- **Method**: `maskEmail()` - preserves domain for context

#### Phone Numbers
- **Input**: `9876543210`
- **Output**: `XXXX-XXXX-3210` (last 4 digits only)
- **Method**: `maskPhone()`

#### Names
- **Input**: `Ramesh Kumar`
- **Output**: `R*** (12 chars)`
- **Method**: `redactName()` - shows first letter and length only

#### Addresses
- **Input**: `123 Main St, Mumbai, Maharashtra 400001`
- **Output**: `[City], [State]` or `{city: "[City]", state: "[State]"}`
- **Method**: `redactAddress()` - removes street, house number, PIN

#### Date of Birth
- **Input**: `1990-05-15`
- **Output**: `30-39` (age range)
- **Method**: `getAgeRange()` - converts to 10-year age bracket

#### Voter IDs
- **Input**: `12345`
- **Output**: `abc123def456` (SHA-256 hash, first 16 chars)
- **Method**: `hashValue()` - consistent hashing for tracking

### Validation

Before sending to OpenAI, all payloads are validated:

```javascript
const validation = sanitizer.validateNoPII(payload);
if (!validation.valid) {
  throw new Error('PII detected in payload');
}
```

Validation checks for:
- 12-digit numbers (Aadhaar pattern)
- Email patterns (`@domain.com`)
- 10-digit numbers (phone pattern)
- Full names (two+ words)

### Example: Sanitized Payload

**Before Sanitization** (NEVER SEND THIS):
```json
{
  "voter_id": 12345,
  "name": "Ramesh Kumar",
  "aadhaar_number": "123456789012",
  "email": "ramesh@example.com",
  "mobile_number": "9876543210",
  "address": "123 Main St, Mumbai, Maharashtra 400001",
  "dob": "1990-05-15"
}
```

**After Sanitization** (SAFE TO SEND):
```json
{
  "voter_id_hash": "abc123def456",
  "name_redacted": "R*** (12 chars)",
  "aadhaar_masked": "XXXX-XXXX-9012",
  "email_masked": "user@example.com",
  "phone_masked": "XXXX-XXXX-3210",
  "address_redacted": {
    "city": "[City]",
    "state": "[State]"
  },
  "dob_range": "30-39"
}
```

## Retention Policy

### Audit Logs

- **Retention Period**: 30 days (configurable via `OPENAI_AUDIT_RETENTION_DAYS`)
- **Automatic Cleanup**: Old logs are deleted automatically
- **Manual Cleanup**: Run `openaiLogger.cleanupOldLogs(30)`

### What's Logged

1. **Request ID**: UUID for tracking
2. **User ID**: Who made the request
3. **Role**: User's role
4. **Endpoint**: Which OpenAI endpoint was called
5. **Redacted Payload**: Sanitized input (safe to store)
6. **Response Summary**: Metadata about response (not full text)
7. **Latency**: Response time in milliseconds
8. **Timestamp**: When the call was made

### What's NOT Logged

- Full OpenAI response text (only summary)
- Raw PII (always sanitized)
- API keys or tokens
- Internal system details

## Access Control

### Role-Based Access

| Endpoint | Admin2 | Admin3 | Admin4 | Admin5 |
|----------|--------|--------|--------|--------|
| explain-anomaly | ✅ | ✅ | ✅ | ✅ |
| recommend-action | ✅ | ✅ | ✅ | ✅ |
| summarize-security | ❌ | ✅ | ✅ | ✅ |
| name-quality-explain | ✅ | ✅ | ✅ | ✅ |
| document-summary | ✅ | ✅ | ✅ | ✅ |
| generate-notice | ❌ | ✅ | ✅ | ✅ |
| debug-prompt | ❌ | ❌ | ❌ | ✅ |

### Rate Limits

- **Admin2**: 30 calls/hour
- **Admin3**: 120 calls/hour
- **Admin4**: 500 calls/hour
- **Admin5**: 1000 calls/hour
- **Global**: 10,000 calls/day

## Compliance

### Data Protection

- **No PII Storage**: OpenAI responses don't contain PII
- **Encrypted Transit**: All API calls use HTTPS
- **Access Logs**: All access is logged and auditable
- **Right to Deletion**: Audit logs can be deleted on request

### Audit Trail

Every OpenAI call creates an audit entry:
- Who made the call
- When it was made
- What endpoint was called
- What sanitized data was sent
- Response metadata

## Incident Response

If PII is accidentally sent to OpenAI:

1. **Immediate**: Revoke OpenAI API key
2. **Investigate**: Check audit logs for the request
3. **Notify**: Inform data protection officer
4. **Remediate**: Update sanitization logic
5. **Document**: Record incident in security log

## Best Practices

1. **Always sanitize**: Never bypass `sanitizer.redact()`
2. **Test sanitization**: Verify no PII in test payloads
3. **Monitor logs**: Regularly review `openai_call_logs`
4. **Limit access**: Only grant to necessary roles
5. **Review responses**: Validate AI responses before action
6. **Rotate keys**: Change API keys periodically
7. **Update prompts**: Keep prompts focused and non-PII

