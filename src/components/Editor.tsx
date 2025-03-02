import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Code, Save } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';

const lowlight = createLowlight(common);

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
  minHeight = "300px",
  showToolbar = true,
  showSaveDraft = true
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
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-4',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-0',
          },
        },
        codeBlock: false,
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
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

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (user && showSaveDraft && !isNewContent.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveDraft(html);
        }, 60000); // 1 minute
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none p-4 ${!editable ? 'cursor-default' : ''}`,
        style: `min-height: ${minHeight}`,
      },
      handleDrop: () => true, // Prevent drag and drop
      handlePaste: (view, event) => {
        // Only allow plain text paste
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') ?? '';
        view.dispatch(view.state.tr.insertText(text));
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
      // Use the save_draft RPC function
      const { data, error } = await supabase.rpc('save_draft', {
        p_content: html,
        p_title: null,
        p_is_auto_saved: true
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

  return (
    <div className="relative">
      {showToolbar && editable && (
        <div className="bg-gray-100 p-2 border-b border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded ${editor.isActive('bold') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded ${editor.isActive('italic') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded ${editor.isActive('underline') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded ${editor.isActive('codeBlock') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
            <div className="flex-1" />
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
          {saveError && (
            <div className="text-xs text-red-500 mt-1">
              {saveError}
            </div>
          )}
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className={`min-h-[150px] prose prose-sm max-w-none ${!editable ? 'select-text' : ''}`}
      />
    </div>
  );
}