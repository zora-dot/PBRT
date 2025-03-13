import React, { useState, useEffect } from 'react';
import { FileText, Code, FileCode, Copy, Check } from 'lucide-react';
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

interface CopyButtonProps {
  onClick: () => void;
  copied: boolean;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ onClick, copied, className = '' }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
      copied
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    } ${className}`}
    title="Copy to clipboard"
  >
    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    {copied ? 'Copied!' : 'Copy'}
  </button>
);

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
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [plainTextContent, setPlainTextContent] = useState('');

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

  const handleCopy = async (isCode: boolean = false) => {
    try {
      let textToCopy;
      
      if (isCode) {
        // For code view, copy the formatted HTML
        textToCopy = formatHTML(content);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        // For rich text view, create a temporary div to get plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = richTextContent;
        textToCopy = tempDiv.innerText || tempDiv.textContent || '';
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      
      await navigator.clipboard.writeText(textToCopy);
    } catch (error) {
      console.error('Failed to copy:', error);
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
              ? 'bg-gradient-to-r from-blue-300 to-blue-400 text-black shadow-sm'
              : 'text-gray-800 hover:text-gray-900'
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
              ? 'bg-gradient-to-r from-green-200 to-green-300 text-black shadow-sm'
              : 'text-gray-800 hover:text-gray-900'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Code</span>
        </button>

      </div>

      {mode === 'richtext' ? (
        <div className="relative">
          <Editor
            content={richTextContent}
            onChange={handleRichTextChange}
            editable={editable}
            minHeight={minHeight}
            showToolbar={showToolbar}
            showSaveDraft={showSaveDraft}
          />
          <div className="absolute top-2 right-2">
            <CopyButton
              onClick={() => handleCopy(false)}
              copied={copied}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <CopyButton
              onClick={() => handleCopy(true)}
              copied={copiedCode}
            />
          </div>
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