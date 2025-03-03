import React, { useState, useEffect } from 'react';
import { FileText, Code, FileCode } from 'lucide-react';
import Editor from './Editor';
import { lowlight } from 'lowlight';
import js from 'highlight.js/lib/languages/javascript';

// Register JavaScript language for highlighting
lowlight.registerLanguage('js', js);
lowlight.registerLanguage('javascript', js);

interface DualModeEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  minHeight?: string;
  showToolbar?: boolean;
  showSaveDraft?: boolean;
}

export default function DualModeEditor({
  content,
  onChange,
  editable = true,
  minHeight = '300px',
  showToolbar = true,
  showSaveDraft = true
}: DualModeEditorProps) {
  const [mode, setMode] = useState<'richtext' | 'code'>('richtext');
  const [richTextContent, setRichTextContent] = useState(content);

  // Format HTML with proper indentation and line breaks
  const formatHTML = (html: string): string => {
    let formatted = html;
    
    // Add line breaks before and after <p> tags
    formatted = formatted.replace(/<p/g, '\n<p');
    formatted = formatted.replace(/<\/p>/g, '</p>\n');
    
    // Add line breaks for other block elements
    formatted = formatted.replace(/<(div|h[1-6]|ul|ol|li|blockquote)/g, '\n<$1');
    formatted = formatted.replace(/<\/(div|h[1-6]|ul|ol|li|blockquote)>/g, '$&\n');
    
    // Remove extra line breaks
    formatted = formatted.replace(/\n\s*\n/g, '\n');
    formatted = formatted.trim();
    
    return formatted;
  };

  const handleRichTextChange = (html: string) => {
    setRichTextContent(html);
    onChange(html);
  };

  // Helper to format and highlight code
  const formatCode = (code: string): string => {
    try {
      // Try to detect and highlight as JavaScript
      const highlighted = lowlight.highlight('javascript', code).value;
      return highlighted
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&quot;/g, '"');
    } catch (error) {
      // If highlighting fails, escape HTML and return plain text
      return code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&quot;/g, '"')
        || '\n';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        {/* Rich Text Tab */}
        <button
          onClick={() => setMode('richtext')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            mode === 'richtext'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Rich Text</span>
        </button>
        {/* Code View Tab */}
        <button
          onClick={() => setMode('code')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            mode === 'code'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Code</span>
        </button>

      </div>

      {mode === 'richtext' ? (
        <Editor
          content={richTextContent}
          onChange={handleRichTextChange}
          editable={editable}
          minHeight={minHeight}
          showToolbar={showToolbar}
          showSaveDraft={showSaveDraft}
        />
      ) : (
        <div className="relative">
          <pre 
            className="w-full px-4 py-3 font-mono text-sm bg-gray-900 text-gray-100 border border-gray-700 rounded-lg overflow-x-auto"
            style={{ minHeight }}
          >
            {formatHTML(content).split('\n').map((line, i) => (
              <div key={`line-${i}`} className="flex">
                <span className="select-none text-gray-500 w-12 text-right pr-4">
                  {i + 1}
                </span>
                <code className="flex-1">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: formatCode(line)
                    }}
                  />
                </code>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}