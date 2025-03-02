import React, { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter } from '@codemirror/lint';
import { format } from 'prettier';
import * as prettierPlugins from 'prettier/plugins/babel';
import { Check, AlertTriangle, Code2, FileCode2 } from 'lucide-react';

interface CodeEditorProps {
  content: string;
  language?: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

const languageMap = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  python: python(),
  cpp: cpp(),
  java: java(),
  rust: rust(),
  sql: sql(),
  php: php(),
  html: html(),
  css: css(),
  json: json(),
  markdown: markdown(),
};

export default function CodeEditor({ content, language = 'javascript', onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isFormatting, setIsFormatting] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        languageMap[language as keyof typeof languageMap] || javascript(),
        oneDark,
        lintGutter(),
        linter((view) => {
          // Basic linting example - can be expanded
          const errors = [];
          const text = view.state.doc.toString();
          
          if (text.includes('console.log')) {
            errors.push({
              from: text.indexOf('console.log'),
              to: text.indexOf('console.log') + 'console.log'.length,
              severity: 'warning',
              message: 'Avoid using console.log in production code'
            });
          }

          return errors;
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.editable.of(!readOnly)
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [language]);

  const handleFormat = async () => {
    if (!viewRef.current) return;

    try {
      setIsFormatting(true);
      const text = viewRef.current.state.doc.toString();
      
      const formatted = await format(text, {
        parser: language === 'typescript' ? 'typescript' : 'babel',
        plugins: [prettierPlugins],
        semi: true,
        singleQuote: true
      });

      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: formatted
        }
      });

      viewRef.current.dispatch(transaction);
    } catch (error) {
      console.error('Formatting error:', error);
      setErrors([error instanceof Error ? error.message : 'Formatting failed']);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary-600" />
          <select 
            value={language}
            onChange={(e) => onChange?.(e.target.value)}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {Object.keys(languageMap).map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        
        {!readOnly && (
          <button
            onClick={handleFormat}
            disabled={isFormatting}
            className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            <FileCode2 className="w-4 h-4" />
            {isFormatting ? 'Formatting...' : 'Format'}
          </button>
        )}
      </div>

      <div ref={editorRef} className="min-h-[300px] max-h-[600px] overflow-auto" />

      {errors.length > 0 && (
        <div className="bg-red-50 p-2 border-t border-red-100">
          {errors.map((error, i) => (
            <div key={i} className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}