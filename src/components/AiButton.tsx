/**
 * AI Assist Button Component
 * Small button that opens AI modal for assistance
 */

import { useState } from 'react';
import AiModal from './AiModal';

interface AiButtonProps {
  endpoint: string;
  payload: any;
  buttonText?: string;
  buttonIcon?: string;
  className?: string;
  onResult?: (result: any) => void;
}

export default function AiButton({
  endpoint,
  payload,
  buttonText = 'Ask AI',
  buttonIcon = '🤖',
  className = '',
  onResult,
}: AiButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition ${className}`}
        title="Get AI assistance"
      >
        <span>{buttonIcon}</span>
        <span>{buttonText}</span>
      </button>

      {showModal && (
        <AiModal
          endpoint={endpoint}
          payload={payload}
          onClose={() => setShowModal(false)}
          onResult={onResult}
        />
      )}
    </>
  );
}

