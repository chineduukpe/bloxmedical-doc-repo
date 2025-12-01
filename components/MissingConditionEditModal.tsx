'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface MissingCondition {
  id: string;
  condition_name: string;
  user_id: string;
  session_id: string;
  original_query: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface MissingConditionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  condition: MissingCondition | null;
  onUpdate: () => void;
}

export default function MissingConditionEditModal({
  isOpen,
  onClose,
  condition,
  onUpdate,
}: MissingConditionEditModalProps) {
  const [status, setStatus] = useState<string>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] p-4 text-gray-900',
      },
    },
  });

  // Initialize form data when modal opens or condition changes
  useEffect(() => {
    if (isOpen && condition) {
      setStatus(condition.status || 'pending');
      if (editor) {
        editor.commands.setContent(condition.admin_notes || '');
      }
    }
  }, [isOpen, condition, editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!condition || !editor) return;

    setIsSubmitting(true);
    try {
      const htmlContent = editor.getHTML();
      const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL;
      
      if (!aiServiceUrl) {
        throw new Error('AI Service URL is not configured');
      }

      const response = await fetch(`${aiServiceUrl}/missing-conditions/${condition.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_notes: htmlContent === '<p></p>' ? null : htmlContent,
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update missing condition');
      }
    } catch (error) {
      console.error('Error updating missing condition:', error);
      alert(error instanceof Error ? error.message : 'Failed to update missing condition');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !condition) return null;

  // Add styles for Tiptap editor
  const editorStyles = `
    .ProseMirror {
      outline: none;
      min-height: 200px;
      padding: 1rem;
    }
    .ProseMirror p {
      margin: 0.5rem 0;
    }
    .ProseMirror p:first-child {
      margin-top: 0;
    }
    .ProseMirror p:last-child {
      margin-bottom: 0;
    }
    .ProseMirror h1 {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 1rem 0;
    }
    .ProseMirror h2 {
      font-size: 1.25rem;
      font-weight: bold;
      margin: 0.75rem 0;
    }
    .ProseMirror h3 {
      font-size: 1.125rem;
      font-weight: bold;
      margin: 0.5rem 0;
    }
    .ProseMirror ul, .ProseMirror ol {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    .ProseMirror li {
      margin: 0.25rem 0;
    }
  `;

  return (
    <>
      <style>{editorStyles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Missing Condition</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Name
            </label>
            <input
              type="text"
              value={condition.condition_name}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Query
            </label>
            <textarea
              value={condition.original_query}
              disabled
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes
            </label>
            <div className="border border-gray-300 rounded-md bg-white">
              {editor && (
                <>
                  <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('bold')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('italic')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('underline')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <u>U</u>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('strike')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <s>S</s>
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('heading', { level: 1 })
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('heading', { level: 2 })
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('heading', { level: 3 })
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      H3
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('bulletList')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`px-2 py-1 rounded text-sm ${
                        editor.isActive('orderedList')
                          ? 'bg-[#107EAA] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      1.
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().undo().run()}
                      className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      ↶
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().redo().run()}
                      className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      ↷
                    </button>
                  </div>
                  <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                    <EditorContent editor={editor} />
                  </div>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use the toolbar to format your notes
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#107EAA] text-white rounded-md hover:bg-[#0e6b8f] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Condition'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}

