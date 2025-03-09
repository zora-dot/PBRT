import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import js from 'highlight.js/lib/languages/javascript';
import Strike from '@tiptap/extension-strike';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

// Register JavaScript language for code highlighting
lowlight.registerLanguage('js', js);
lowlight.registerLanguage('javascript', js);

import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Code,
  Save,
} from 'lucide-react';

import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * Custom AB-with-line icon (like MS Word) for strike-through.
 */
function StrikeThroughABIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <text x="2" y="16" fontSize="14" fontFamily="Arial, sans-serif" fill="currentColor">
        AB
      </text>
      <line x1="2" y1="12" x2="18" y2="12" />
    </svg>
  );
}

interface EditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  minHeight?: string;
  showToolbar?: boolean;
  showSaveDraft?: boolean;
}

export default function Editor({
  content,
  onChange,
  editable = true,
  minHeight = '300px',
  showToolbar = true,
  showSaveDraft = true,
}: EditorProps) {
  const { user } = useAuth();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNewContent = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: 'list-disc ml-4' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal ml-4' } },
        paragraph: { HTMLAttributes: { class: 'mb-0' } },
        codeBlock: false,
      }),
      UnderlineExtension,
      Strike,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        languageClassPrefix: 'language-',
        languageClassPrefix: 'language-',
        HTMLAttributes: {
          class: 'rounded-md bg-gray-900 p-4 font-mono text-sm text-white',
        },
      }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      setIsDirty(true);

      // Auto-save after 1 min if user is logged in
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (user && showSaveDraft && !isNewContent.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveDraft(html);
        }, 60000);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none p-4 ${
          !editable ? 'cursor-default' : ''
        }`,
        style: `min-height: ${minHeight}`,
      },
      handleDrop: () => true,
      handlePaste: (view, event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const lines = text.split(/\r?\n/);
        const nodes = lines.map((line) => ({
          type: 'paragraph',
          content: line ? [{ type: 'text', text: line }] : [],
        }));
        editor.chain().focus().insertContent(nodes).run();
        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isNewContent.current = true;
      editor.commands.setContent(content);
      setIsDirty(false);
      setLastSaved(null);
      isNewContent.current = false;
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveDraft = async (html: string) => {
    if (!user || !isDirty || !showSaveDraft || isNewContent.current) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const { data, error } = await supabase.rpc('save_draft', {
        p_content: html,
        p_title: null,
        p_is_auto_saved: true,
      });
      if (error) throw error;
      setLastSaved(new Date());
      setIsDirty(false);
      setSaveError(null);
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveError('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!editor || !user) return;
    await saveDraft(editor.getHTML());
  };

  if (!editor) {
    return null;
  }

  const predefinedColors = [
    '#000000', '#2E2E2E', '#4A90E2', '#E74C3C', '#27AE60',
    '#F39C12', '#8E44AD', '#3498DB', '#E67E22', '#BDC3C7'
  ];

  return (
    <div className="relative">
      {/* (Removed the second title input) */}

      {/* 1. Toolbar with gradient border */}
      {showToolbar && editable && (
        <div
          className="bg-gray-100 p-2 mb-2"
          style={{
            border: '2px solid transparent',
            borderImage: 'linear-gradient(45deg, #00c6fb, #005bea) 1',
            borderImageSlice: 1,
          }}
        >
          <div className="flex flex-wrap gap-2 items-center">
            {/* Bold / Italic / Underline / Strike */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded ${
                editor.isActive('bold') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded ${
                editor.isActive('italic') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded ${
                editor.isActive('underline') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded ${
                editor.isActive('strike') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Strike-Through"
            >
              <StrikeThroughABIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Text Align */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Bullet List, Ordered List, Code Block */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded ${
                editor.isActive('bulletList') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded ${
                editor.isActive('orderedList') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded ${
                editor.isActive('codeBlock') ? 'bg-primary-200' : 'hover:bg-primary-100'
              }`}
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Color Palette */}
            <div className="grid grid-cols-5 gap-1">
              {predefinedColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  className={`w-6 h-6 rounded-full border ${
                    editor.isActive('textStyle', { color }) 
                      ? 'ring-2 ring-primary-500 ring-offset-2'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="flex-1" />

            {/* Save Draft */}
            {user && showSaveDraft && (
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || !isDirty}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  isDirty && !isSaving
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title="Save Draft"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}
          </div>

          {lastSaved && showSaveDraft && (
            <div className="text-xs text-gray-500 mt-1">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          {saveError && <div className="text-xs text-red-500 mt-1">{saveError}</div>}
        </div>
      )}

      {/* 2. Paste Content Box with gradient border */}
      <EditorContent
        editor={editor}
        className={`min-h-[150px] prose prose-sm max-w-none ${
          !editable ? 'select-text' : ''
        }`}
        style={{
          border: '2px solid transparent',
          borderImage: 'linear-gradient(45deg, #00c6fb, #005bea) 1',
          borderImageSlice: 1,
        }}
      />
    </div>
  );
}