'use client';

import { useCallback, useEffect, useState } from 'react';

interface ApiDevice {
  id: number | string;
  device_name?: string;
  deviceName?: string;
  device_token?: string;
  deviceToken?: string;
  token?: string;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
  last_seen_at?: string | null;
  lastSeenAt?: string | null;
}

interface RegisteredDevice {
  id: number | string;
  deviceName: string;
  isActive: boolean;
  createdAt?: string;
  lastSeenAt?: string | null;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?:
    | ApiDevice[]
    | ApiDevice
    | null;
  device?: ApiDevice;
  devices?: ApiDevice[];
  deviceToken?: string;
  device_token?: string;
  token?: string;
}

function normalizeDevice(device: ApiDevice): RegisteredDevice {
  return {
    id: device.id,
    deviceName:
      device.deviceName ?? device.device_name ?? 'Unnamed device',
    isActive: device.isActive ?? device.is_active ?? false,
    createdAt: device.createdAt ?? device.created_at,
    lastSeenAt: device.lastSeenAt ?? device.last_seen_at ?? null,
  };
}

export default function DeviceRegister() {
  const [deviceName, setDeviceName] = useState('My ESP32-S3');
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const loadDevices = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/user/devices', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ??
            result.error ??
            'Unable to load registered devices.',
        );
      }

      const deviceList = Array.isArray(result.data)
        ? result.data
        : result.devices ?? [];

      setDevices(deviceList.map(normalizeDevice));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load registered devices.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = deviceName.trim();

    if (!name) {
      setError('Please enter a device name.');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');
    setDeviceToken('');
    setCopyMessage('');

    try {
      const response = await fetch('/api/user/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceName: name }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ??
            result.error ??
            `Device registration failed (${response.status}).`,
        );
      }

      // Your API returns:
      // { success: true, data: { device_token: "..." } }
      const responseData =
        result.data && !Array.isArray(result.data)
          ? result.data
          : result.device;

      const returnedToken =
        result.deviceToken ??
        result.device_token ??
        result.token ??
        responseData?.device_token ??
        responseData?.deviceToken ??
        responseData?.token;

      if (
        typeof returnedToken !== 'string' ||
        returnedToken.trim().length === 0
      ) {
        await loadDevices();

        throw new Error(
          'Registration succeeded, but the API response did not contain a device token. ' +
            'Check the registration API response.',
        );
      }

      // Save the raw token in React state so it appears in the UI.
      setDeviceToken(returnedToken);
      setSuccess(
        'Device registered successfully. Copy your device token below.',
      );
      setDeviceName('');

      // Refresh the registered device list.
      await loadDevices();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong during registration.',
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleCopyToken() {
    if (!deviceToken) {
      setCopyMessage('No device token is available to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(deviceToken);
      setCopyMessage('Token copied successfully. Store it securely.');
    } catch {
      setCopyMessage(
        'Automatic copying failed. Select the token and copy it manually.',
      );
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
  };

  const mutedStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'grid', gap: '1.5rem' }}
    >
      {/* Device registration form */}
      <section style={cardStyle}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="eyebrow">HARDWARE MANAGEMENT</span>

          <h3
            style={{
              color: 'var(--text-primary)',
              fontSize: '1.35rem',
              fontWeight: 700,
              margin: '0.35rem 0',
            }}
          >
            Register a device
          </h3>

          <p style={mutedStyle}>
            Register your ESP32-S3 wearable to your WristTrack account.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          style={{ display: 'grid', gap: '0.75rem' }}
        >
          <label
            htmlFor="device-name"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Device name
          </label>

          <input
            id="device-name"
            name="deviceName"
            type="text"
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
            maxLength={100}
            required
            placeholder="e.g. My ESP32-S3"
            disabled={registering}
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '0.8rem 0.9rem',
              border: '1px solid var(--border)',
              borderRadius: '9px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />

          <p style={mutedStyle}>
            Device type: ESP32-S3 · 2 IMU sensors · 3 pressure sensors
          </p>

          <div>
            <button
              type="submit"
              disabled={registering || !deviceName.trim()}
              className="btn-primary"
              style={{
                padding: '0.8rem 1.15rem',
                borderRadius: '9px',
                cursor: registering ? 'wait' : 'pointer',
                opacity: registering ? 0.7 : 1,
              }}
            >
              {registering ? 'Registering device…' : 'Register device'}
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              marginTop: '1rem',
              padding: '0.9rem',
              borderRadius: '9px',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              overflowWrap: 'anywhere',
            }}
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div
            role="status"
            style={{
              marginTop: '1rem',
              padding: '0.9rem',
              borderRadius: '9px',
              border: '1px solid var(--accent-green)',
              color: 'var(--text-primary)',
            }}
          >
            {success}
          </div>
        )}

        {/* Display the generated device token */}
        {deviceToken && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid var(--accent-green)',
              background: 'var(--bg-primary)',
            }}
          >
            <h4
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              Your device token
            </h4>

            <p style={mutedStyle}>
              Copy this token and configure it on your ESP32-S3.
              It authenticates your device when it submits sensor
              readings. Do not share it or commit it to Git.
            </p>

            <code
              style={{
                display: 'block',
                margin: '0.85rem 0',
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                overflowWrap: 'anywhere',
                userSelect: 'all',
                fontSize: '0.9rem',
                lineHeight: 1.7,
              }}
            >
              {deviceToken}
            </code>

            <button
              type="button"
              onClick={handleCopyToken}
              className="btn-primary"
              style={{
                padding: '0.7rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Copy device token
            </button>

            {copyMessage && (
              <p
                role="status"
                style={{
                  ...mutedStyle,
                  marginTop: '0.75rem',
                }}
              >
                {copyMessage}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Registered devices list */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h3
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '1.1rem',
              }}
            >
              My registered devices
            </h3>

            <p style={mutedStyle}>
              Devices associated with your account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDevices()}
            disabled={loading}
            style={{
              padding: '0.6rem 0.85rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={mutedStyle}>Loading your devices…</p>
        ) : devices.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: '10px',
            }}
          >
            <p
              style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
              No registered devices yet
            </p>

            <p style={{ ...mutedStyle, marginTop: '0.4rem' }}>
              Register your ESP32-S3 above to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {devices.map((device) => (
              <div
                key={device.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--bg-primary)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="5"
                        y="2"
                        width="14"
                        height="20"
                        rx="3"
                      />
                      <path d="M9 6h6M9 18h6" />
                    </svg>
                  </div>

                  <div>
                    <p
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {device.deviceName}
                    </p>

                    <p style={mutedStyle}>
                      Registered{' '}
                      {device.createdAt
                        ? new Date(device.createdAt).toLocaleDateString()
                        : 'date unavailable'}
                    </p>

                    <p style={mutedStyle}>
                      Last seen:{' '}
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleString()
                        : 'No successful upload recorded'}
                    </p>
                  </div>
                </div>

                <span
                  className={
                    device.isActive ? 'badge badge-green' : 'badge'
                  }
                  style={
                    device.isActive
                      ? undefined
                      : {
                          padding: '0.35rem 0.65rem',
                          borderRadius: '999px',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                        }
                  }
                >
                  {device.isActive ? 'Registered · Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}