import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { APP_LOGO_URL } from '../constants';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { confirmPasswordReset } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const code = searchParams.get('oobCode');

    useEffect(() => {
        if (!code) {
            setError('Invalid or expired password reset link.');
        }
    }, [code]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!code) {
            setError('Invalid or expired password reset link.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            await confirmPasswordReset(code, password);
            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Backgrounds */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>

            <div className="bg-white/95 backdrop-blur-sm w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500 border border-white/20">
                <div className="bg-navy-900 p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950 z-0"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <img 
                                src={APP_LOGO_URL} 
                                alt="iNeeda Logo" 
                                className="h-20 w-auto object-contain drop-shadow-2xl rounded-2xl"
                            />
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
                        <p className="text-navy-200 mt-2 text-sm font-medium">Enter your new password below.</p>
                    </div>
                </div>

                <div className="p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start text-sm text-red-600 font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-sm text-green-700 font-medium animate-in slide-in-from-top-2">
                            <CheckCircle2 className="w-5 h-5 mr-3 shrink-0 text-green-600" />
                            <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-2">New Password</label>
                            <input 
                                type="password"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-navy-900 mb-2">Confirm New Password</label>
                            <input 
                                type="password"
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-gold-100 focus:border-gold-400 outline-none transition-all font-medium text-navy-900 placeholder:text-slate-400"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading || !!message}
                            className="w-full py-4 bg-navy-900 hover:bg-navy-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-navy-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
