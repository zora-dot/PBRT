import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function CreatePaste() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreatePaste = async () => {
    if (!user) {
      setError("You must be logged in to create a paste.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pastes') // Updated from paste_details to pastes
        .insert([{ title, content, user_id: user.id }])
        .select('*');

      console.log("New Paste Response:", data);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to create paste.");

      // Redirect to the new paste's page
      navigate(`/paste/${data[0].id}`);
    } catch (err) {
      console.error("Error creating paste:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">Create a New Paste</h1>

      {error && <div className="bg-red-500 text-white p-2 rounded mb-4">{error}</div>}

      <input
        type="text"
        placeholder="Title (optional)"
        className="w-full p-2 border rounded mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Paste your content here..."
        className="w-full p-2 border rounded h-40"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        onClick={handleCreatePaste}
        className="w-full bg-blue-500 text-white p-2 rounded mt-4"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Paste"}
      </button>
    </div>
  );
}