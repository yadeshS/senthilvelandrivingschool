'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'otp' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchTab = (t: typeof tab) => {
    setTab(t); setError(''); setSuccess('');
    setOtpStep('email'); setOtpCode('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setOtpStep('code');
      setSuccess('OTP sent! Check your email for the 6-digit code.');
    } catch (err: any) {
      setError(err.message?.includes('not found') || err.message?.includes('Invalid')
        ? 'No account found with this email.'
        : err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });
      if (error) throw error;
      if (!data.user) throw new Error('Verification failed.');

      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.user.id).single();

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your account has been disabled. Please contact the administrator.');
      }

      if (profile?.role === 'staff' || profile?.role === 'owner') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === 'verified');
        window.location.href = hasVerifiedTOTP ? '/mfa/verify' : '/mfa/setup';
      } else {
        router.push('/portal');
      }
    } catch (err: any) {
      setError(err.message?.includes('expired') || err.message?.includes('invalid')
        ? 'Invalid or expired code. Please try again.'
        : err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.user.id).single();

      // Block disabled accounts immediately after login
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Your account has been disabled. Please contact the administrator.');
      }

      if (profile?.role === 'staff' || profile?.role === 'owner') {
        // Staff/owner must go through MFA
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === 'verified');
        window.location.href = hasVerifiedTOTP ? '/mfa/verify' : '/mfa/setup';
      } else {
        router.push('/portal');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // Check if email exists in profiles table before sending reset link
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single();
      if (profileError || !profile) {
        throw new Error('No account found with this email address.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Password reset link sent! Check your email inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!fullName.trim() || !phone.trim()) {
      setError('Please fill in all fields.'); setLoading(false); return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: 'customer',
          is_approved: true,
        });
        if (profileError) throw profileError;
        setSuccess('Account created! Check your email to confirm, then log in.');
        setTab('login');
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">SV</div>
          <h1>Senthil Velan Driving School</h1>
          <p>Customer Portal</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
            Password
          </button>
          <button className={`login-tab ${tab === 'otp' ? 'active' : ''}`} onClick={() => switchTab('otp')}>
            Email OTP
          </button>
          <button className={`login-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>
            Sign Up
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log In'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="forgot-link" onClick={() => switchTab('forgot')}>
                Forgot Password?
              </button>
            </div>
          </form>
        ) : tab === 'otp' ? (
          otpStep === 'email' ? (
            <form onSubmit={handleSendOtp} className="login-form">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Enter your email and we will send a 6-digit code to log you in.
              </p>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                A 6-digit code was sent to <strong>{email}</strong>.
              </p>
              <div className="form-group">
                <label>Enter OTP Code</label>
                <input
                  type="text" required value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }}
                />
              </div>
              <button type="submit" className="login-submit" disabled={loading || otpCode.length < 6}>
                {loading ? 'Verifying…' : 'Verify & Log In'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button type="button" className="forgot-link" onClick={() => { setOtpStep('email'); setOtpCode(''); setError(''); setSuccess(''); }}>
                  ← Use a different email
                </button>
              </div>
            </form>
          )
        ) : tab === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="login-form">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your email address and we will send you a link to reset your password.
            </p>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="forgot-link" onClick={() => switchTab('login')}>
                ← Back to Log In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text" required value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel" required value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <a href="/" className="login-back">← Back to website</a>
      </div>
    </div>
  );
}
