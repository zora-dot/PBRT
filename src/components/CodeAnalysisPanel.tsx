import React from 'react';
import { AlertTriangle, AlertCircle, Lightbulb, Check } from 'lucide-react';
import { analyzeCode, generateSuggestions } from '../utils/codeAnalysis';

interface CodeAnalysisPanelProps {
  code: string;
  language: string;
}

export default function CodeAnalysisPanel({ code, language }: CodeAnalysisPanelProps) {
  const analysis = analyzeCode(code, language);
  const suggestions = generateSuggestions(code, language);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Code Analysis</h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Errors Section */}
        {analysis.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-red-600">
              <AlertCircle className="w-5 h-5" />
              Errors ({analysis.errors.length})
            </h4>
            <ul className="space-y-1 text-sm">
              {analysis.errors.map((error, i) => (
                <li key={i} className="flex items-start gap-2 text-red-600">
                  <span className="mt-1">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings Section */}
        {analysis.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Warnings ({analysis.warnings.length})
            </h4>
            <ul className="space-y-1 text-sm">
              {analysis.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-yellow-600">
                  <span className="mt-1">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-blue-600">
              <Lightbulb className="w-5 h-5" />
              Suggestions ({suggestions.length})
            </h4>
            <ul className="space-y-1 text-sm">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-600">
                  <span className="mt-1">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All Clear Message */}
        {analysis.errors.length === 0 && 
         analysis.warnings.length === 0 && 
         suggestions.length === 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span>No issues found in your code!</span>
          </div>
        )}
      </div>
    </div>
  );
}