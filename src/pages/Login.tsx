
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';
import { Role } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Login = () => {
    const { login, loginWithGoogle, resetPassword, signup } = useAuth();
    const { users, addUser } = useData();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const firebaseUser = await loginWithGoogle();
            
            // Check if user document exists in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            const cleanEmail = firebaseUser.email || '';
            
            if (!userDocSnap.exists()) {
                const isKnownAdmin = cleanEmail === 'gwelshpersonal@gmail.com' || cleanEmail === 'admin@ineeda.work';
                await addUser({
                    id: firebaseUser.uid,
                    orgId: 'org_1',
                    name: firebaseUser.displayName || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    role: isKnownAdmin ? Role.ADMIN : Role.CLIENT,
                    hourlyRate: 0,
                    isActive: true,
                    verificationStatus: 'VERIFIED',
                    phone: firebaseUser.phoneNumber || '',
                    urgentAlertsEnabled: false,
                    address: '',
                    latitude: 0,
                    longitude: 0
                });
            } else {
                const userData = userDocSnap.data();
                const isKnownAdmin = cleanEmail === 'gwelshpersonal@gmail.com' || cleanEmail === 'admin@ineeda.work';
                if (isKnownAdmin && userData.role !== Role.ADMIN) {
                    await addUser({
                        ...userData,
                        id: firebaseUser.uid,
                        role: Role.ADMIN
                    } as any);
                }
            }
            
            const pendingSessionId = localStorage.getItem('pending_stripe_session_id');
            if (pendingSessionId) {
                navigate(`/profile?session_id=${pendingSessionId}&tab=financials`);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during Google login.');
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        const cleanEmail = email.trim().toLowerCase();

        try {
            // Attempt Firebase login
            const firebaseUser = await login(cleanEmail, password);
            
            // Check if user document exists in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                // If the user doesn't exist in Firestore, create a basic profile
                // If it's the known admin email, grant ADMIN role
                const isKnownAdmin = cleanEmail === 'gwelshpersonal@gmail.com' || cleanEmail === 'admin@ineeda.work';
                await addUser({
                    id: firebaseUser.uid,
                    orgId: 'org_1',
                    name: cleanEmail.split('@')[0],
                    email: cleanEmail,
                    role: isKnownAdmin ? Role.ADMIN : Role.CLIENT,
                    hourlyRate: 0,
                    isActive: true,
                    verificationStatus: 'VERIFIED',
                    phone: '',
                    urgentAlertsEnabled: false,
                    address: '',
                    latitude: 0,
                    longitude: 0
                });
            } else {
                // If they exist, check if they are a known admin but don't have the role
                const userData = userDocSnap.data();
                const isKnownAdmin = cleanEmail === 'gwelshpersonal@gmail.com' || cleanEmail === 'admin@ineeda.work';
                if (isKnownAdmin && userData.role !== Role.ADMIN) {
                    await addUser({
                        ...userData,
                        id: firebaseUser.uid,
                        role: Role.ADMIN
                    } as any);
                }
            }
            
            const pendingSessionId = localStorage.getItem('pending_stripe_session_id');
            if (pendingSessionId) {
                navigate(`/profile?session_id=${pendingSessionId}&tab=financials`);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during login.');
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            await resetPassword(email);
            setMessage(`Password reset link sent to ${email}`);
        } catch (err: any) {
            setError(err.message || 'An error occurred during password reset.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-white relative">
            {/* Left Side - Visual Branding (Hidden on mobile) */}
            <div className="hidden xl:flex w-1/2 bg-navy-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950 z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] animate-pulse z-0"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] z-0"></div>

                <div className="relative z-10 text-center px-16">
                    <img 
                        src={APP_LOGO_URL} 
                        alt="iNeeda Logo" 
                        className="h-96 w-auto mx-auto object-contain drop-shadow-2xl mb-8 rounded-3xl"
                    />
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Your Network of Trusted Pros</h2>
                    <p className="text-navy-200 text-lg leading-relaxed max-w-md mx-auto font-medium">Log in to manage your jobs, crew, and get things done faster.</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full xl:w-1/2 flex flex-col justify-center p-6 sm:p-12 pb-24 bg-slate-50 relative min-h-screen">
                <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Mobile Logo Header */}
                    <div className="xl:hidden text-center mb-10 text-navy-900">
                        <img 
                            src={APP_LOGO_URL} 
                            alt="iNeeda Logo" 
                            className="h-48 w-auto mx-auto object-contain drop-shadow-md mb-4 rounded-3xl"
                        />
                        <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back</h1>
                        <p className="text-slate-500 mt-2 font-medium">Log in to manage your jobs and crew.</p>
                    </div>
                    
                    <div className="hidden xl:block mb-8">
                        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Welcome Back</h1>
                        <p className="text-slate-500 mt-2 font-medium">Please enter your details to sign in.</p>
                    </div>

                    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100">
                        {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start text-sm text-red-600 font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-sm text-green-700 font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 shrink-0 text-green-600" />
                            <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-2">Email Address</label>
                            <input 
                                type="email"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="name@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-navy-900">Password</label>
                                <button 
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs font-bold text-gold-600 hover:text-gold-500 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input 
                                type="password"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-navy-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center mt-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                            )}
                        </button>
                        
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-navy-900 text-lg font-bold rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
                        <div>
                            <span className="text-slate-500 text-sm font-medium mr-2">Don't have an account?</span>
                            <Link to="/signup" className="text-gold-600 font-extrabold hover:text-gold-500 transition-colors text-sm inline-block">
                                Create an Account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Home Link */}
                <div className="absolute bottom-6 left-0 right-0 text-center xl:left-auto xl:right-auto xl:w-full max-w-md mx-auto px-6">
                    <Link to="/" className="text-slate-400 hover:text-navy-900 transition-colors text-sm font-medium inline-flex items-center">
                        ← Back to Home Public Page
                    </Link>
                </div>
            </div>
        </div>
    );
};
