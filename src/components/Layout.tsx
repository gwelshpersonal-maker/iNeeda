
import React, { useState } from 'react';
import { NavLink, useLocation, Navigate, Link } from 'react-router-dom';
import { 
  Home, Calendar, Clock, DollarSign, Briefcase, 
  Menu, X, UserCircle, MapPin, Search, ClipboardList, LogOut, Users, ShieldCheck, HelpCircle, Gift, TrendingUp, Settings, FileText, Activity, MessageCircle, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role } from '../types';
import { APP_LOGO_URL } from '../constants';

const NAV_ITEMS = [
  // Client Items
  { name: 'Service Menu', path: '/dashboard', icon: Home, roles: [Role.CLIENT] },
  { name: 'Messages', path: '/chat', icon: MessageCircle, roles: [Role.CLIENT] },
  { name: 'My Addresses', path: '/sites', icon: MapPin, roles: [Role.CLIENT] },
  { name: 'Provider Directory', path: '/directory', icon: Users, roles: [Role.CLIENT] },
  
  // Provider Items
  { name: 'Find Work', path: '/dashboard', icon: Search, roles: [Role.PROVIDER] },
  { name: 'My Schedule', path: '/schedule', icon: Calendar, roles: [Role.PROVIDER] },
  { name: 'Messages', path: '/chat', icon: MessageCircle, roles: [Role.PROVIDER] },
  { name: 'Provider Directory', path: '/directory', icon: Users, roles: [Role.PROVIDER] },
  { name: 'Biz Center', path: '/biz-center', icon: Briefcase, roles: [Role.PROVIDER] },

  // Admin Items
  { name: 'Dashboard', path: '/dashboard', icon: Home, roles: [Role.ADMIN] },
  { name: 'Approvals & Users', path: '/staff', icon: ShieldCheck, roles: [Role.ADMIN] },
  { name: 'Platform Settlements', path: '/biz-center', icon: DollarSign, roles: [Role.ADMIN] },
  { name: 'Tech Status', path: '/admin/status', icon: Activity, roles: [Role.ADMIN] },
  
  // Shared/Other
  { name: 'My Profile', path: '/profile', icon: UserCircle, roles: [Role.CLIENT, Role.PROVIDER, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER] },
  { name: 'Support', path: '/support', icon: HelpCircle, roles: [Role.CLIENT, Role.PROVIDER, Role.ADMIN, Role.EMPLOYEE, Role.MANAGER] },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { currentUser, logout, isLoading } = useAuth();
  const { users } = useData();

  // Public Routes that don't need authentication
  const publicRoutes = ['/login', '/signup', '/public/jobs', '/reset-password', '/terms', '/privacy', '/contact', '/support-public', '/services', '/pro-services', '/about'];
  const isPublicRoute = location.pathname === '/' || publicRoutes.some(route => location.pathname.startsWith(route));

  if (isLoading) {
      return (
          <div className="min-h-screen bg-navy-950 flex items-center justify-center">
              <div className="text-center">
                  <div className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gold-400 font-bold animate-pulse">Loading Application...</p>
              </div>
          </div>
      );
  }

  if (isPublicRoute) {
      if (currentUser && (location.pathname === '/login' || location.pathname === '/signup')) {
          return <Navigate to="/dashboard" replace />;
      }
      return <>{children}</>;
  }

  if (!currentUser) {
      return <Navigate to="/login" replace />;
  }

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-navy-950 text-white fixed h-full z-20 shadow-2xl overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-4">
          <div className="flex justify-center mb-6">
            <Link 
              to="/" 
              className="group relative rounded-2xl overflow-hidden shadow-2xl border-4 border-transparent hover:border-gold-400 transition-all duration-300 transform hover:-translate-y-1 block bg-slate-50 relative"
              title="Return to Public Site"
            >
                <img 
                src={APP_LOGO_URL} 
                alt="iNeeda Logo" 
                className="h-52 w-auto max-w-full object-contain drop-shadow-md p-2 group-hover:scale-105 transition-transform duration-500 rounded-3xl"
              />
              {/* Hover overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950 via-navy-950/90 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none rounded-b-xl flex items-end justify-center h-1/2">
                <div className="flex items-center gap-2 text-gold-400 font-bold text-sm bg-navy-950/80 px-4 py-2 rounded-full backdrop-blur-sm border border-gold-400/30">
                  <Globe className="w-4 h-4" />
                  <span>Public Site</span>
                </div>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-3 bg-navy-900/50 p-3 rounded-2xl border border-navy-800/50 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-bold text-lg shadow-lg">
                {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <div className="truncate font-bold text-sm text-white">{currentUser.name}</div>
                <div className="text-[10px] text-gold-400 font-bold uppercase tracking-wider">{currentUser.role === Role.CLIENT ? 'Member' : currentUser.role === Role.ADMIN ? 'Administrator' : 'Local Pro'}</div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 py-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gold-400 text-navy-900 shadow-lg shadow-gold-400/20 translate-x-1' 
                    : 'text-slate-400 hover:bg-navy-900 hover:text-white hover:translate-x-1'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-navy-900' : 'text-slate-500 group-hover:text-gold-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
        
        {/* Footer Actions */}
        <div className="p-4 mt-auto">
            <button 
                onClick={logout}
                className="w-full flex items-center justify-center px-4 py-3 bg-navy-900 hover:bg-red-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all duration-300 group"
            >
                <LogOut className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Sign Out
            </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-navy-950 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-xl border-b border-navy-900">
        <div className="flex items-center gap-2">
            <Link to="/" className="active:scale-95 transition-transform" title="Return to Public Site">
              <img 
                src={APP_LOGO_URL} 
                alt="iNeeda Logo" 
                className="h-16 w-auto object-contain rounded-xl bg-slate-50 p-1"
              />
            </Link>
        </div>
        <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                 <div className="text-xs font-bold text-white">{currentUser.name}</div>
                 <div className="text-[10px] text-gold-400 font-bold">{currentUser.role}</div>
             </div>
             <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-navy-900 transition-colors"
             >
                {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-navy-950 z-20 pt-24 px-4 animate-in fade-in slide-in-from-top-5">
          <nav className="space-y-2">
            {filteredNavItems.map((item) => {
               const Icon = item.icon;
               return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `flex items-center px-4 py-4 text-base font-bold rounded-xl transition-all ${
                    isActive ? 'bg-gold-400 text-navy-900' : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                  }`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-6 h-6 mr-4 ${isActive ? 'text-navy-900' : 'text-gold-400'}`} />
                      {item.name}
                    </>
                  )}
                </NavLink>
               )
            })}
             
             <button 
                onClick={logout}
                className="w-full mt-8 flex items-center justify-center px-4 py-4 bg-navy-900 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg"
            >
                <LogOut className="w-5 h-5 mr-2" /> Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-4 md:p-10 overflow-y-auto bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
};
