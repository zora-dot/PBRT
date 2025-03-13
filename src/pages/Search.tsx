import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SearchResult {
  type: 'user';
  id: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Search users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .ilike('username', `%${query}%`)
        .limit(10);

      if (usersError) throw usersError;

      setResults(users?.map(user => ({
        type: 'user' as const,
        ...user
      })) || []);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Search Results - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Search Results</h1>
          <p className="text-primary-200">
            {query ? `Showing user results for "${query}"` : 'Enter a search term to find users'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-primary-100">Searching...</div>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {query ? 'No users found' : 'Enter a search term to find users'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(user => (
              <Link
                key={user.id}
                to={`/profile/${user.username}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 p-4"
              >
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-primary-600">
                        {user.username?.[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                    <p className="text-sm text-gray-500">
                      Joined {format(new Date(user.created_at), 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}