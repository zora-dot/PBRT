import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Draft {
  id: string;
  title: string | null;
  content: string;
  last_modified: string;
  is_auto_saved: boolean;
}

export default function Drafts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDrafts();
  }, [user, navigate]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_modified', { ascending: false });

      if (error) throw error;

      // Extract titles from content if available
      const draftsWithTitles = (data || []).map(draft => {
        let title = draft.title;
        if (!title && draft.content) {
          try {
            // Try to parse content as HTML and extract first heading or first line
            const parser = new DOMParser();
            const doc = parser.parseFromString(draft.content, 'text/html');
            const heading = doc.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading) {
              title = heading.textContent || null;
            } else {
              // Get first non-empty line of text
              const text = doc.body.textContent || '';
              const firstLine = text.split('\n').find(line => line.trim());
              title = firstLine ? firstLine.slice(0, 50) : null; // Limit to 50 chars
            }
          } catch (e) {
            console.error('Error parsing draft content:', e);
          }
        }
        return {
          ...draft,
          title: title || 'Untitled Draft'
        };
      });

      setDrafts(draftsWithTitles);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftIds: string[]) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${draftIds.length} draft${draftIds.length === 1 ? '' : 's'}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('drafts')
        .delete()
        .in('id', draftIds)
        .eq('user_id', user?.id);

      if (error) throw error;
      setDrafts(drafts.filter(draft => !draftIds.includes(draft.id)));
      setSelectedDrafts(new Set());
    } catch (error) {
      console.error('Error deleting drafts:', error);
      alert('Failed to delete drafts');
    }
  };

  const handleEditDraft = async (draftId: string) => {
    try {
      // Get the draft content
      const { data: draft, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;

      // Delete the draft since we're loading it into the editor
      await supabase
        .from('drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user?.id);

      // Navigate to home with draft data
      navigate('/', { 
        state: { 
          draftContent: draft.content,
          draftTitle: draft.title
        }
      });
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Failed to load draft');
    }
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === drafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(drafts.map(draft => draft.id)));
    }
  };

  const toggleDraftSelection = (draftId: string) => {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId);
    } else {
      newSelected.add(draftId);
    }
    setSelectedDrafts(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Drafts - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Your Drafts</h1>
              <p className="text-primary-200">Access your saved and auto-saved drafts</p>
            </div>
            {drafts.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 text-primary-100 hover:text-white transition-colors"
                >
                  {selectedDrafts.size === drafts.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedDrafts.size > 0 && (
                  <button
                    onClick={() => handleDelete(Array.from(selectedDrafts))}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Selected ({selectedDrafts.size})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">You don't have any drafts yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {drafts.map((draft) => (
                <div key={draft.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.has(draft.id)}
                        onChange={() => toggleDraftSelection(draft.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {draft.title}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500 flex items-center gap-4">
                          <span>
                            Last modified {formatDistanceToNow(new Date(draft.last_modified))} ago
                          </span>
                          {draft.is_auto_saved && (
                            <span className="text-primary-600">Auto-saved</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditDraft(draft.id)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Edit draft"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete([draft.id])}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete draft"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}