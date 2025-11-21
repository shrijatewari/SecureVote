/**
 * AI Modal Component
 * Displays AI assistance interface with request/response
 */

import { useState } from 'react';
import { openaiService } from '../services/api';

interface AiModalProps {
  endpoint: string;
  payload: any;
  onClose: () => void;
  onResult?: (result: any) => void;
}

export default function AiModal({ endpoint, payload, onClose, onResult }: AiModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');

  const handleAskAI = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await openaiService.callEndpoint(endpoint, payload);
      
      if (response.data.success) {
        setResult(response.data.data);
        setRequestId(response.data.request_id || '');
        if (onResult) {
          onResult(response.data.data);
        }
      } else {
        setError(response.data.error || 'Failed to get AI response');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to call AI service';
      setError(errorMsg);
      
      if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please try again later.');
      } else if (err.response?.status === 503) {
        setError('OpenAI service not configured. Please contact administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert('Copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-response-${requestId || Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">🤖 AI Assistant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Request Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Request</h3>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          {/* Action Button */}
          {!result && !loading && (
            <button
              onClick={handleAskAI}
              className="w-full btn-primary py-3"
            >
              Ask AI
            </button>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">AI is thinking...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-800">AI Response</h3>
                  {requestId && (
                    <span className="text-xs text-gray-500">ID: {requestId.substring(0, 8)}...</span>
                  )}
                </div>
                <div className="space-y-3">
                  {result.explanation && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Explanation:</p>
                      <p className="text-sm text-gray-600">{result.explanation}</p>
                    </div>
                  )}
                  {result.recommended_actions && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {result.recommended_actions.map((action: string, idx: number) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.recommended_steps && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Steps:</p>
                      <ol className="list-decimal list-inside text-sm text-gray-600">
                        {result.recommended_steps.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {result.summary && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Summary:</p>
                      <p className="text-sm text-gray-600">{result.summary}</p>
                    </div>
                  )}
                  {result.short_notice && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Short Notice:</p>
                      <p className="text-sm text-gray-600">{result.short_notice}</p>
                    </div>
                  )}
                  {result.long_notice && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Long Notice:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.long_notice}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  💾 Download
                </button>
                <button
                  onClick={handleAskAI}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  🔄 Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            ⚠️ All data is sanitized before sending to AI. No personal information is shared.
          </p>
        </div>
      </div>
    </div>
  );
}

