import React from 'react';
import { Link } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-6 md:mb-0">
              <Link to="/" className="flex items-center group">
                <img src="/logo.png" alt="iNeeda Logo" className="h-6 w-auto mr-2 rounded-md group-hover:opacity-80 transition-opacity grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100" />
              </Link>
          </div>
          <div className="flex space-x-6 mb-6 md:mb-0">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/support-public" className="hover:text-white transition-colors">Support</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-navy-900/50 text-xs text-slate-500 text-center md:text-left">
          <p className="mb-2"><strong>Marketplace Disclosure:</strong> "iNeeda" is a technology platform connecting independent contractors with clients; we do not employ pros or direct their work.</p>
          <p>&copy; {new Date().getFullYear()} iNeeda All rights reserved.</p>
      </div>
    </footer>
  );
};
