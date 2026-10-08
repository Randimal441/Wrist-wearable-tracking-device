'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function StrengthBar({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#f87171', '#fb923c', '#fbbf24', '#34d399'];

  if (!password) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= strength ? colors[strength] : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '0.75rem', color: colors[strength] || 'var(--text-muted)' }}>
        {labels[strength]}
      </span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Signup failed. Please try again.');
        return;
      }

      setSuccess('Account created! Redirecting to your dashboard…');
      setTimeout(() => { router.push('/dashboard'); router.refresh(); }, 1200);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-mesh min-h-screen flex items-center justify-center p-4">
      {/* Theme toggle — floating top-right */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 50 }}>
        <ThemeToggle />
      </div>
      {/* Background glow orbs */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-5%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="7" />
                <path d="M12 6v6l3 3" />
              </svg>
            </div>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Wrist<span style={{ color: 'var(--accent-secondary)' }}>Track</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Research IoT Tracking System</p>
        </div>

        {/* Card */}
        <div className="auth-card" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              Create your account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Join WristTrack and start monitoring your health data
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }} role="alert">
                <span style={{ marginRight: '0.5rem' }}>⚠</span>{error}
              </div>
            )}
            {success && (
              <div className="alert-success" style={{ marginBottom: '1.25rem' }} role="status">
                <span style={{ marginRight: '0.5rem' }}>✓</span>{success}
              </div>
            )}

            {/* Name */}
            <div style={{ marginBottom: '1.125rem' }}>
              <label htmlFor="name" className="input-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John Doe"
                  style={{ paddingLeft: '2.75rem' }}
                />
                <svg style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1.125rem' }}>
              <label htmlFor="email" className="input-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="you@example.com"
                  style={{ paddingLeft: '2.75rem' }}
                />
                <svg style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.125rem' }}>
              <label htmlFor="password" className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Min. 8 characters"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                />
                <svg style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }} aria-label="Toggle password">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></>
                    ) : (
                      <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>
                    )}
                  </svg>
                </button>
              </div>
              <StrengthBar password={form.password} />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Re-enter password"
                  style={{ paddingLeft: '2.75rem', borderColor: form.confirmPassword && form.password !== form.confirmPassword ? 'var(--accent-red)' : undefined }}
                />
                <svg style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading || !!success}
              className="btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="divider-text" style={{ margin: '1.75rem 0' }}>or</div>

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
