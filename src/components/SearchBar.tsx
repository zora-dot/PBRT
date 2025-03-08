import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Search, User, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SearchResult {
  type: 'paste' | 'user';
  id: string;
  title?: string;
  created_at?: string;
  username?: string;
  avatar_url?: string;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  enableResults?: boolean;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search pastes and users...",
  className = "",
  enableResults = true
}: SearchBarProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      onSearch?.('');
      return;
    }

    const timer = setTimeout(async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const [pastesResponse, usersResponse] = await Promise.all([
          // Search pastes
          supabase
            .from('pastes')
            .select('id, title')
            .textSearch('search_vector', query)
            .order('created_at', { ascending: false })
            .filter('is_public', 'eq', true)
            .limit(3),

          // Search users - only if query is at least 4 characters
          query.length >= 4 ? 
            supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .ilike('username', `%${query}%`)
              .limit(3) :
            { data: [], error: null }
        ]);

        const combinedResults: SearchResult[] = [
          ...(pastesResponse.data?.map(paste => ({
            type: 'paste' as const,
            id: paste.id,
            title: paste.title
          })) || []),
          ...(usersResponse.data?.map(user => ({
            type: 'user' as const,
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url
          })) || [])
        ];

        setResults(combinedResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }
    if (query.trim()) {
      onSearch?.(query.trim());
      setShowResults(false);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSearch}>
        <div className={`flex items-center bg-primary-800/50 rounded-lg border border-primary-600/50 focus-within:border-primary-500 ${className}`}>
          <Search className="w-5 h-5 text-primary-300 ml-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder={placeholder}
            className="w-64 px-3 py-2 bg-transparent text-primary-100 placeholder-primary-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onSearch?.('');
              }}
              className="p-1 mr-2 text-primary-400 hover:text-primary-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {enableResults && showResults && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          {!user ? (
            <div className="p-4 text-center text-gray-600">
              You must be logged in to use this feature
            </div>
          ) : loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {query.trim() 
                ? query.length < 4 
                  ? 'No results found'
                  : 'No results found'
                : 'Start typing to search'}
            </div>
          ) : (
            <>
              <div className="divide-y">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    to={
                      result.type === 'paste'
                        ? `/paste/${result.id}`
                        : `/profile/${result.username}`
                    }
                    className="block p-3 hover:bg-gray-50"
                    onClick={() => setShowResults(false)}
                  >
                    <div className="flex items-center gap-3">
                      {result.type === 'user' ? (
                        <>
                          <User className="w-5 h-5 text-primary-500" />
                          <div>
                            <span className="font-medium text-gray-900">
                              {result.username}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">User</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5 text-primary-500" />
                          <div>
                            <span className="font-medium text-gray-900">
                              {result.title || 'Untitled Paste'}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">Paste</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="p-2 bg-gray-50 border-t">
                <button
                  onClick={handleSearch}
                  className="w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-700 text-center"
                >
                  View all results
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}