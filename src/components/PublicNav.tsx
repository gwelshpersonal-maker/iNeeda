import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const PublicNav: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { currentUser } = useAuth();

  return (
    <nav className="sticky top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <img src="/logo.png" alt="iNeeda Logo" className="h-14 w-auto mr-2 rounded-xl group-hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/services" className="text-slate-600 hover:text-navy-900 font-medium transition-colors">Services</Link>
            <Link to="/about" className="text-slate-600 hover:text-navy-900 font-medium transition-colors">How It Works</Link>
            <Link to="/pro-services" className="text-slate-600 hover:text-navy-900 font-medium transition-colors">For Pros</Link>
            <Link to="/signup" className="text-slate-600 hover:text-navy-900 font-medium transition-colors">Join Early</Link>
            <div className="flex items-center space-x-4 pl-4 border-l border-slate-200">
              {currentUser ? (
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-navy-900 text-white font-bold rounded-full hover:bg-navy-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Launch App <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-navy-900 font-bold hover:text-gold-600 transition-colors">Log In</Link>
                  <Link 
                    to="/signup" 
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-navy-900 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link to="/services" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Services</Link>
            <Link to="/about" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">How It Works</Link>
            <Link to="/pro-services" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">For Pros</Link>
            <Link to="/signup" className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Join Early</Link>
            <div className="pt-4 mt-2 border-t border-slate-100 grid gap-3">
               {currentUser ? (
                  <Link to="/dashboard" className="w-full flex items-center justify-center px-4 py-3 bg-navy-900 text-white font-bold rounded-xl">
                    Launch App
                  </Link>
               ) : (
                 <>
                  <Link to="/login" className="w-full flex items-center justify-center px-4 py-3 border-2 border-navy-900 text-navy-900 font-bold rounded-xl">
                    Log In
                  </Link>
                  <Link to="/signup" className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-bold rounded-xl">
                    Sign Up Free
                  </Link>
                 </>
               )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
