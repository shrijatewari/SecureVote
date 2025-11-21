# OpenAI Integration Guide

## Overview

This document describes the OpenAI integration for SecureVote Election Management System. The integration provides AI-powered assistance for election administrators while maintaining strict privacy and security standards.

## Security & Privacy

**CRITICAL**: This integration is designed with privacy-first principles:

- **NO PII is ever sent to OpenAI** - All data is sanitized and pseudonymized before API calls
- **Audit logging** - Every OpenAI call is logged with request ID, user, endpoint, and sanitized payload
- **Rate limiting** - Per-user and per-role rate limits prevent abuse
- **RBAC enforcement** - Only authorized admin roles can access OpenAI endpoints

## Environment Variables

Add these to your `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_TIMEOUT_MS=20000
OPENAI_MAX_TOKENS=800
OPENAI_AUDIT_RETENTION_DAYS=30
```

## Database Setup

Run the migration to create the audit log table:

```bash
npm run migrate:openai
```

## API Endpoints

All endpoints are under `/api/ai/openai` and require authentication + RBAC.

### 1. Explain Anomaly
**POST** `/api/ai/openai/explain-anomaly`
- **Role**: Admin2+ (admin, ero, deo, ceo, eci)
- **Rate Limit**: 30/hour
- **Payload**:
```json
{
  "issueType": "duplicate_voter",
  "region": "Mumbai",
  "metrics": {
    "count": 5,
    "severity": "high"
  },
  "sample_count": 5,
  "aggregated_flags": ["similarity_0.95"]
}
```

### 2. Recommend Action
**POST** `/api/ai/openai/recommend-action`
- **Role**: Admin2+
- **Rate Limit**: 30/hour
- **Payload**:
```json
{
  "issueType": "duplicate_voter",
  "context": "Multiple voters with similar names",
  "severity": "high",
  "suggested_actions": ["Field verification", "Document review"]
}
```

### 3. Summarize Security
**POST** `/api/ai/openai/summarize-security`
- **Role**: Admin3+ (deo, ceo, eci)
- **Rate Limit**: 120/hour
- **Payload**:
```json
{
  "timeWindow": "24h",
  "categories": ["failed_login", "suspicious_activity"],
  "counts": {
    "failed_login": 15,
    "suspicious_activity": 3
  },
  "topAlerts": [
    {
      "type": "failed_login",
      "severity": "medium",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### 4. Explain Name Quality
**POST** `/api/ai/openai/name-quality-explain`
- **Role**: Admin2+
- **Rate Limit**: 30/hour
- **Payload**:
```json
{
  "name_metrics": {
    "length": 8,
    "entropy": 2.5,
    "ngram_score": 0.001,
    "freq_score": 0.0
  },
  "anonymized_example_id": "abc123"
}
```

### 5. Document Summary
**POST** `/api/ai/openai/document-summary`
- **Role**: Admin2+ or DocVerifier
- **Rate Limit**: 30/hour
- **Payload**:
```json
{
  "ocr_summary": {
    "fields": ["name", "dob", "address"],
    "confidences": {
      "name": 0.95,
      "dob": 0.88
    },
    "missing": ["signature"]
  },
  "doc_type": "aadhaar"
}
```

### 6. Generate Notice
**POST** `/api/ai/openai/generate-notice`
- **Role**: Admin3+
- **Rate Limit**: 120/hour
- **Payload**:
```json
{
  "notice_type": "election",
  "lang": "en",
  "audience": "citizens",
  "key_points": [
    "Election date: 2024-05-15",
    "Voter registration deadline: 2024-04-30"
  ]
}
```

### 7. Debug Prompt (Admin5/ECI only)
**POST** `/api/ai/openai/debug-prompt`
- **Role**: ECI only
- **Rate Limit**: 1000/hour
- **Payload**:
```json
{
  "issue": "System performance degradation",
  "context": "API response times increased",
  "logs_summary": "High database query times detected"
}
```

### 8. Get Call History
**GET** `/api/ai/openai/history?limit=50`
- **Role**: Admin2+
- Returns user's OpenAI call history

### 9. Get Call Statistics
**GET** `/api/ai/openai/stats?hours=24`
- **Role**: Admin3+
- Returns aggregate statistics

## Frontend Usage

### Using AiButton Component

```tsx
import AiButton from '../components/AiButton';

<AiButton
  endpoint="explain-anomaly"
  payload={{
    issueType: "duplicate_voter",
    region: "Mumbai",
    sample_count: 5
  }}
  buttonText="Explain"
  buttonIcon="💡"
  onResult={(result) => {
    console.log('AI Explanation:', result);
  }}
/>
```

### Using AiModal Component

```tsx
import AiModal from '../components/AiModal';

<AiModal
  endpoint="recommend-action"
  payload={{
    issueType: "duplicate_voter",
    context: "Multiple similar records",
    severity: "high"
  }}
  onClose={() => setShowModal(false)}
  onResult={(result) => {
    // Handle result
  }}
/>
```

### Using AiExplainPanel Component

```tsx
import AiExplainPanel from '../components/AiExplainPanel';

<AiExplainPanel
  issueType="duplicate_voter"
  region="Mumbai"
  sampleCount={5}
  aggregatedFlags={["similarity_0.95"]}
  metrics={{
    similarity_score: 0.95,
    match_fields: ["name", "dob"]
  }}
/>
```

## Data Sanitization

All data is automatically sanitized before sending to OpenAI:

- **Aadhaar numbers**: Masked to `XXXX-XXXX-1234` (last 4 digits only)
- **Email addresses**: Redacted to `user@domain.com`
- **Phone numbers**: Masked to `XXXX-XXXX-1234`
- **Names**: Redacted to `R*** (8 chars)`
- **Addresses**: Only city/state retained
- **DOB**: Converted to age range (e.g., "30-39")

## Audit Logging

Every OpenAI call is logged to `openai_call_logs` table:

- `request_id`: Unique UUID for tracking
- `user_id`: User who made the request
- `role`: User's role
- `endpoint`: API endpoint called
- `redacted_payload`: Sanitized input (JSON)
- `response_summary`: Summary of response (JSON)
- `latency_ms`: Response time
- `created_at`: Timestamp

Logs are retained for 30 days by default (configurable via `OPENAI_AUDIT_RETENTION_DAYS`).

## Rate Limiting

Rate limits are enforced per role:

- **Admin2** (admin, ero): 30 calls/hour
- **Admin3** (deo): 120 calls/hour
- **Admin4** (ceo): 500 calls/hour
- **Admin5** (eci): 1000 calls/hour
- **Global**: 10,000 calls/day (all users combined)

## Error Handling

Common errors:

- **429**: Rate limit exceeded - wait before retrying
- **503**: OpenAI service not configured - check `OPENAI_API_KEY`
- **401**: Invalid API key - verify key in `.env`
- **400**: Invalid request - check payload format

## Testing

Run tests with mocked OpenAI responses:

```bash
npm test
```

Tests use `nock` or `msw` to mock OpenAI API calls - the repository never calls OpenAI during tests.

## Troubleshooting

### OpenAI API Key Not Working
1. Verify key is set in `.env` file
2. Check key starts with `sk-`
3. Ensure key has sufficient credits
4. Check API key permissions in OpenAI dashboard

### Rate Limit Errors
1. Check your role's rate limit
2. Wait for the rate limit window to reset
3. Use call history endpoint to see your usage

### PII Detection Errors
1. Ensure all data is sanitized before sending
2. Check `sanitizer.js` for sanitization rules
3. Review audit logs to see what was sent

## Security Best Practices

1. **Never bypass sanitization** - Always use `sanitizer.redact()` before API calls
2. **Monitor audit logs** - Regularly review `openai_call_logs` for suspicious activity
3. **Rotate API keys** - Change `OPENAI_API_KEY` periodically
4. **Limit access** - Only grant OpenAI access to necessary admin roles
5. **Review responses** - Always validate AI responses before taking action

## Support

For issues or questions:
1. Check audit logs: `SELECT * FROM openai_call_logs ORDER BY created_at DESC LIMIT 50`
2. Review error messages in backend logs
3. Check OpenAI API status: https://status.openai.com

