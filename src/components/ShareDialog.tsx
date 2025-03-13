import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Facebook, Twitter, Linkedin as LinkedIn, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export default function ShareDialog({ isOpen, onClose, url, title }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchShortUrl = async () => {
        try {
          setLoading(true);
          setError(null);
          setIsGeneratingUrl(true);
          
          // Extract paste ID from URL
          const pasteId = url.split('/').pop();
          
          if (!pasteId) {
            throw new Error('Invalid paste URL');
          }

          // First check if a short URL already exists
          const { data: existingUrl, error: existingError } = await supabase
            .from('shortened_urls')
            .select('full_short_url')
            .eq('paste_id', pasteId)
            .maybeSingle();

          if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
          }

          // If a short URL exists, use it
          if (existingUrl?.full_short_url) {
            setShortUrl(existingUrl.full_short_url);
            return;
          }

          // If no short URL exists, create one
          const shortId = Math.random().toString(36).substring(2, 8);
          const shortDomain = import.meta.env.VITE_CLIENT_URL_SHORTENER || 'https://pb-rt.com';
          const fullShortUrl = `${shortDomain}/${shortId}`;

          const { error: insertError } = await supabase
            .from('shortened_urls')
            .insert({
              paste_id: pasteId,
              short_id: shortId,
              full_original_url: url,
              full_short_url: fullShortUrl
            });

          if (insertError) throw insertError;

          setShortUrl(fullShortUrl);
        } catch (error) {
          console.error('Error fetching/creating short URL:', error);
          setError('Failed to generate short URL');
          setShortUrl(null);
        } finally {
          setLoading(false);
          setIsGeneratingUrl(false);
        }
      };

      void fetchShortUrl();
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const shareUrl = shortUrl || url;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Share Paste</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* URL Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={loading ? 'Loading...' : shareUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={copyToClipboard}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <LinkIcon className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Original URL */}
          {shortUrl && (
            <div className="text-sm text-gray-500">
              Original URL: {url}
            </div>
          )}

          {/* Social Share Buttons */}
          <div>
            <p className="text-sm text-gray-600 mb-3">Share on social media</p>
            <div className="flex items-center gap-4">
              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Share on Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-sky-500 hover:bg-sky-50 rounded-full transition-colors"
                title="Share on Twitter"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                title="Share on LinkedIn"
              >
                <LinkedIn className="w-6 h-6" />
              </a>
              <a
                href={shareLinks.email}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Share via Email"
              >
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t rounded-b-lg">
          <p className="text-sm text-gray-500 text-center">
            Anyone with this link can view this paste
          </p>
        </div>
      </motion.div>
    </div>
  );
}