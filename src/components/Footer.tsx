import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary-900/50 backdrop-blur-sm border-t border-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-primary-100 text-sm">
            © {new Date().getFullYear()} PasteBin Rich Text. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-primary-100 text-sm mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <a href="mailto:support@pastebinrichtext.com" className="hover:text-white transition-colors">
                support@pastebinrichtext.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}