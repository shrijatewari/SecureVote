/**
 * AI Notice Composer Component
 * UI for generating multilingual notices using OpenAI
 */

import { useState } from 'react';
import { openaiService } from '../services/api';
import AiModal from './AiModal';

interface AiNoticeComposerProps {
  onNoticeGenerated?: (notice: any) => void;
}

export default function AiNoticeComposer({ onNoticeGenerated }: AiNoticeComposerProps) {
  const [noticeType, setNoticeType] = useState('general');
  const [lang, setLang] = useState('en');
  const [audience, setAudience] = useState('citizens');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [showModal, setShowModal] = useState(false);
  const [generatedNotice, setGeneratedNotice] = useState<any>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' },
  ];

  const noticeTypes = [
    { value: 'general', label: 'General Notice' },
    { value: 'election', label: 'Election Notice' },
    { value: 'revision', label: 'Roll Revision Notice' },
    { value: 'grievance', label: 'Grievance Resolution' },
    { value: 'verification', label: 'Verification Required' },
  ];

  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const handleKeyPointChange = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    const payload = {
      notice_type: noticeType,
      lang: lang,
      audience: audience,
      key_points: keyPoints.filter(kp => kp.trim().length > 0),
    };
    setShowModal(true);
  };

  const handleResult = (result: any) => {
    setGeneratedNotice(result);
    if (onNoticeGenerated) {
      onNoticeGenerated(result);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📝 AI Notice Composer</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
          <select
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value)}
            className="input-field"
          >
            {noticeTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="input-field"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="input-field"
          >
            <option value="citizens">Citizens</option>
            <option value="officials">Election Officials</option>
            <option value="all">All Users</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Key Points</label>
          {keyPoints.map((point, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={point}
                onChange={(e) => handleKeyPointChange(index, e.target.value)}
                className="input-field flex-1"
                placeholder={`Key point ${index + 1}`}
              />
              {keyPoints.length > 1 && (
                <button
                  onClick={() => handleRemoveKeyPoint(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddKeyPoint}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add Key Point
          </button>
        </div>

        <button
          onClick={handleGenerate}
          className="btn-primary w-full"
          disabled={keyPoints.filter(kp => kp.trim().length > 0).length === 0}
        >
          🤖 Generate Notice with AI
        </button>
      </div>

      {showModal && (
        <AiModal
          endpoint="generate-notice"
          payload={{
            notice_type: noticeType,
            lang: lang,
            audience: audience,
            key_points: keyPoints.filter(kp => kp.trim().length > 0),
          }}
          onClose={() => setShowModal(false)}
          onResult={handleResult}
        />
      )}

      {generatedNotice && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Generated Notice</h4>
          {generatedNotice.short_notice && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Short Version:</p>
              <p className="text-sm text-gray-600">{generatedNotice.short_notice}</p>
            </div>
          )}
          {generatedNotice.long_notice && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Long Version:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{generatedNotice.long_notice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

