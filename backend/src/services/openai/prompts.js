/**
 * OpenAI Prompt Templates
 * Standardized prompts for each use case
 * All prompts are designed to work with sanitized (non-PII) data only
 */

class PromptTemplates {
  /**
   * System instruction for all prompts
   */
  getSystemInstruction() {
    return `You are an expert election administration assistant for SecureVote, a government-grade election management system. 
Your role is to provide concise, accurate explanations and recommendations based on aggregated, anonymized data.

CRITICAL RULES:
- Never invent or guess personal information, names, addresses, or identification numbers
- Base responses only on the provided sanitized metrics and aggregated data
- Be concise and actionable
- If data is insufficient, say so clearly
- Always respond in valid JSON format`;
  }

  /**
   * Explain anomaly prompt
   */
  explainAnomaly(anomalyData) {
    return {
      system: this.getSystemInstruction(),
      user: `Analyze this election system anomaly and provide an explanation:

Issue Type: ${anomalyData.issue_type}
Region: ${anomalyData.region}
Sample Count: ${anomalyData.metrics.count}
Severity: ${anomalyData.metrics.severity}
Aggregated Flags: ${JSON.stringify(anomalyData.metrics.flags)}

Respond in JSON format:
{
  "explanation": "Brief explanation of why this anomaly likely occurred",
  "confidence": "high|medium|low",
  "recommended_actions": ["Action 1", "Action 2"],
  "notes": "Any additional context or warnings"
}`,
    };
  }

  /**
   * Recommend action prompt
   */
  recommendAction(actionData) {
    return {
      system: this.getSystemInstruction(),
      user: `Based on this election administration context, recommend step-by-step actions:

Issue Type: ${actionData.issue_type}
Context: ${actionData.context}
Severity: ${actionData.severity}
Suggested Actions (if any): ${JSON.stringify(actionData.suggested_actions || [])}

Respond in JSON format:
{
  "recommended_steps": ["Step 1", "Step 2", "Step 3"],
  "priority": "high|medium|low",
  "estimated_time": "estimated time to complete",
  "dependencies": ["Any prerequisites"],
  "notes": "Additional recommendations"
}`,
    };
  }

  /**
   * Summarize security events prompt
   */
  summarizeSecurity(securityData) {
    return {
      system: this.getSystemInstruction(),
      user: `Summarize these security events for an election administration dashboard:

Time Window: ${securityData.time_window}
Categories: ${JSON.stringify(securityData.categories)}
Event Counts: ${JSON.stringify(securityData.counts)}
Top Alerts: ${JSON.stringify(securityData.top_alerts)}

Respond in JSON format:
{
  "summary": "2-3 sentence summary of security posture",
  "key_concerns": ["Concern 1", "Concern 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "severity_overall": "high|medium|low"
}`,
    };
  }

  /**
   * Explain name quality flag prompt
   */
  explainNameQuality(nameMetrics) {
    return {
      system: this.getSystemInstruction(),
      user: `Explain why a name was flagged based on these sanitized metrics:

Length: ${nameMetrics.length}
Entropy: ${nameMetrics.entropy.toFixed(2)}
N-gram Score: ${nameMetrics.ngram_score.toFixed(2)}
Frequency Score: ${nameMetrics.freq_score.toFixed(2)}

Respond in JSON format:
{
  "explanation": "One sentence explaining why the name was flagged",
  "reason": "primary reason (e.g., 'low_entropy', 'invalid_pattern', 'not_in_dictionary')",
  "recommendation": "reject|flag|accept",
  "confidence": "high|medium|low"
}`,
    };
  }

  /**
   * Document summary prompt
   */
  documentSummary(docData) {
    return {
      system: this.getSystemInstruction(),
      user: `Analyze this document verification summary and suggest next steps:

Document Type: ${docData.doc_type}
Fields Detected: ${JSON.stringify(docData.fields_detected)}
Confidence Scores: ${JSON.stringify(docData.confidences)}
Missing Fields: ${JSON.stringify(docData.missing_fields)}

Respond in JSON format:
{
  "summary": "Brief summary of document verification status",
  "next_steps": ["Step 1", "Step 2"],
  "confidence": "high|medium|low",
  "requires_review": true|false,
  "notes": "Any additional observations"
}`,
    };
  }

  /**
   * Generate notice prompt
   */
  generateNotice(noticeData) {
    return {
      system: `You are a professional government communications writer for election administration. 
Produce formal, clear notices in the requested language. Keep tone professional and accessible.
Never include personal information or specific identification numbers.`,
      user: `Generate a ${noticeData.notice_type} notice:

Language: ${noticeData.lang}
Audience: ${noticeData.audience}
Key Points: ${JSON.stringify(noticeData.key_points)}

Respond in JSON format:
{
  "short_notice": "Brief 1-2 sentence notice",
  "long_notice": "Detailed multi-paragraph notice",
  "subject": "Email/subject line",
  "key_highlights": ["Highlight 1", "Highlight 2"]
}`,
    };
  }

  /**
   * Debug prompt (Admin5 only)
   */
  debugPrompt(debugData) {
    return {
      system: this.getSystemInstruction(),
      user: `Debug this election system issue (sanitized data only):

Issue: ${debugData.issue}
Context: ${debugData.context}
Logs Summary: ${debugData.logs_summary || 'N/A'}

Respond in JSON format:
{
  "analysis": "Technical analysis of the issue",
  "root_cause": "Likely root cause",
  "solution": "Recommended solution",
  "prevention": "How to prevent this in future"
}`,
    };
  }
}

module.exports = new PromptTemplates();

