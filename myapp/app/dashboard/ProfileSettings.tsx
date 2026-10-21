'use client';

import { FormEvent, useState } from 'react';

interface ProfileSettingsProps {
  user: { name: string; email: string };
  onSaved: () => void;
}

export default function ProfileSettings({ user, onSaved }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Could not update your profile.');
        return;
      }

      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSaved();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="eyebrow">Account</span>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', margin: '.35rem 0 .5rem' }}>Profile settings</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Update your personal details and account password.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
        <section className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 1rem' }}>Personal details</h4>
          <label className="input-label" htmlFor="profile-name">Username</label>
          <input
            id="profile-name"
            className="input-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
          <label className="input-label" htmlFor="profile-email" style={{ display: 'block', marginTop: '1rem' }}>Email address</label>
          <input id="profile-email" className="input-field" value={user.email} disabled />
          <p style={{ color: 'var(--text-muted)', fontSize: '.75rem', margin: '.5rem 0 0' }}>Email changes are not available here.</p>
        </section>

        <section className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 .4rem' }}>Change password</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', margin: '0 0 1rem' }}>Leave these fields blank if you only want to change your username.</p>
          <label className="input-label" htmlFor="current-password">Current password</label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={currentPassword}
            visible={showCurrentPassword}
            onChange={setCurrentPassword}
            onToggle={() => setShowCurrentPassword((visible) => !visible)}
          />
          <label className="input-label" htmlFor="new-password" style={{ display: 'block', marginTop: '1rem' }}>New password</label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            visible={showNewPassword}
            onChange={setNewPassword}
            onToggle={() => setShowNewPassword((visible) => !visible)}
          />
          <label className="input-label" htmlFor="confirm-password" style={{ display: 'block', marginTop: '1rem' }}>Confirm new password</label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            visible={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
          />
        </section>

        {error && <div className="alert-error" role="alert">{error}</div>}
        {message && <div className="alert-success" role="status">{message}</div>}
        <button type="submit" className="btn-primary" disabled={saving} style={{ justifySelf: 'start' }}>
          {saving ? 'Saving changes…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function PasswordInput({
  id,
  autoComplete,
  minLength,
  value,
  visible,
  onChange,
  onToggle,
}: {
  id: string;
  autoComplete: string;
  minLength?: number;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        className="input-field"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ paddingRight: '2.75rem' }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)',
          padding: 0, border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
        }}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 10 8 10 8a17.3 17.3 0 0 1-3.1 4.4" /><path d="M6.6 6.6C3.8 8.3 2 12 2 12s3 8 10 8a10 10 0 0 0 3.4-.6" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
