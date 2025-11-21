/**
 * AI Explain Panel Component
 * Attaches to rows/tables to explain anomalies or flags
 */

import { useState } from 'react';
import AiButton from './AiButton';

interface AiExplainPanelProps {
  issueType: string;
  region?: string;
  metrics?: any;
  sampleCount?: number;
  aggregatedFlags?: string[];
  onExplanation?: (explanation: any) => void;
}

export default function AiExplainPanel({
  issueType,
  region,
  metrics,
  sampleCount,
  aggregatedFlags,
  onExplanation,
}: AiExplainPanelProps) {
  const payload = {
    issueType,
    region: region || '[Region]',
    metrics: metrics || {},
    sample_count: sampleCount || 0,
    aggregated_flags: aggregatedFlags || [],
  };

  return (
    <AiButton
      endpoint="explain-anomaly"
      payload={payload}
      buttonText="Explain"
      buttonIcon="💡"
      className="text-xs"
      onResult={onExplanation}
    />
  );
}

