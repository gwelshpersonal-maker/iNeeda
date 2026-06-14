
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { Staff } from './pages/Staff';
import { Settlements } from './pages/Settlements';
import { PublicJobBoard } from './pages/PublicJobBoard';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { PublicSupport } from './pages/PublicSupport';
import { Contact } from './pages/Contact';
import { PublicServices } from './pages/PublicServices';
import { PublicProServices } from './pages/PublicProServices';
import { PublicAbout } from './pages/PublicAbout';
import { Sites } from './pages/Sites';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ResetPassword } from './pages/ResetPassword';
import { Support } from './pages/Support';
import { VelvetRopeApplication } from './pages/VelvetRopeApplication';
import { AccountProfile } from './pages/AccountProfile';
import { ProviderStaffing } from './pages/ProviderStaffing';
import { TechStatus } from './pages/TechStatus';
import { Chat } from './pages/Chat';
import { BizCenter } from './pages/BizCenter';
import { ProDirectory } from './pages/ProDirectory';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AuthProvider>
          <BrowserRouter>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/apply" element={<VelvetRopeApplication />} />
              <Route path="/services" element={<PublicServices />} />
              <Route path="/pro-services" element={<PublicProServices />} />
              <Route path="/about" element={<PublicAbout />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support-public" element={<PublicSupport />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/public/jobs" element={<PublicJobBoard />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/sites" element={<Sites />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/support" element={<Support />} />
              <Route path="/profile" element={<AccountProfile />} />
              <Route path="/staffing" element={<ProviderStaffing />} />
              <Route path="/admin/status" element={<TechStatus />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/biz-center" element={<BizCenter />} />
              <Route path="/directory" element={<ProDirectory />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
    </ErrorBoundary>
  );
};

export default App;
