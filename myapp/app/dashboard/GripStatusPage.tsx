'use client';

import { useCallback, useEffect, useState } from 'react';

interface GripReading {
  id: number | string;
  session_id: number | string;
  sample_index: number | string;
  device_timestamp_ms: number | string;
  pressure1_raw: number | string;
  pressure2_raw: number | string;
  pressure3_raw: number | string;
  pressure1_pa: number | string | null;
  pressure2_pa: number | string | null;
  pressure3_pa: number | string | null;
  imu1_ax: number | string;
  imu1_ay: number | string;
  imu1_az: number | string;
  imu1_gx: number | string;
  imu1_gy: number | string;
  imu1_gz: number | string;
  imu2_ax: number | string;
  imu2_ay: number | string;
  imu2_az: number | string;
  imu2_gx: number | string;
  imu2_gy: number | string;
  imu2_gz: number | string;
  received_at: string;
  session_name: string | null;
  started_at: string;
  device_id: number | string;
  device_name: string;
}

interface GripApiResponse {
  success: boolean;
  message?: string;
  data?: {
    latest: GripReading | null;
    history: GripReading[];
  };
}

function numeric(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : date.toLocaleString();
}

export default function GripStatusPage() {
  const [latest, setLatest] = useState<GripReading | null>(null);
  const [history, setHistory] = useState<GripReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const loadGripData = useCallback(async () => {
    try {
      const response = await fetch('/api/user/grip-status', {
        method: 'GET',
        cache: 'no-store',
      });

      const result = (await response.json()) as GripApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? 'Could not load grip sensor data.',
        );
      }

      setLatest(result.data?.latest ?? null);
      setHistory(result.data?.history ?? []);
      setError('');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load grip sensor data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGripData();

    const interval = window.setInterval(() => {
      void loadGripData();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadGripData]);

  const pressureSensors = latest
    ? [
        {
          name: 'Pressure Sensor 1',
          value: numeric(latest.pressure1_raw),
          calibrated: latest.pressure1_pa,
        },
        {
          name: 'Pressure Sensor 2',
          value: numeric(latest.pressure2_raw),
          calibrated: latest.pressure2_pa,
        },
        {
          name: 'Pressure Sensor 3',
          value: numeric(latest.pressure3_raw),
          calibrated: latest.pressure3_pa,
        },
      ]
    : [];

  const maxPressure = Math.max(
    1,
    ...pressureSensors.map((sensor) => sensor.value),
  );

  const hasPressure = pressureSensors.some(
    (sensor) => sensor.value > 0,
  );

  const readingAge = latest
    ? Date.now() - new Date(latest.received_at).getTime()
    : Infinity;

  const isFresh =
    Number.isFinite(readingAge) &&
    readingAge >= 0 &&
    readingAge <= 30000;

  const statusLabel = !latest
    ? 'Waiting for sensor data'
    : !isFresh
      ? 'No recent readings'
      : hasPressure
        ? 'Pressure detected'
        : 'No pressure detected';

  const statusColor = !latest
    ? 'var(--text-muted)'
    : !isFresh
      ? 'var(--accent-orange)'
      : hasPressure
        ? 'var(--accent-green)'
        : 'var(--text-muted)';

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    minWidth: 0,
  };

  const mutedStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'grid', gap: '1.25rem' }}
    >
      {/* Dashboard heading */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="eyebrow">LIVE SENSOR MONITORING</span>

            <h3
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.4rem',
                fontWeight: 700,
                margin: '0.4rem 0',
              }}
            >
              Grip Status
            </h3>

            <p style={mutedStyle}>
              Pressure readings received from your registered wearable.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadGripData()}
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
            }}
          >
            {loading ? 'Loading…' : 'Refresh readings'}
          </button>
        </div>

        <p style={{ ...mutedStyle, marginTop: '0.75rem' }}>
          Dashboard refreshes every 5 seconds.
          {lastUpdated ? ` Last checked: ${lastUpdated}` : ''}
        </p>
      </section>

      {/* Errors */}
      {error && (
        <section
          role="alert"
          style={{
            ...cardStyle,
            borderColor: 'var(--accent-red)',
            color: 'var(--accent-red)',
          }}
        >
          {error}
        </section>
      )}

      {/* No data */}
      {!loading && !error && !latest && (
        <section style={cardStyle}>
          <h4
            style={{
              color: 'var(--text-primary)',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            No sensor readings yet
          </h4>

          <p style={mutedStyle}>
            Your device may be registered, but no sensor readings have
            been stored for your account yet. Start a bowling session
            and send readings from the ESP32-S3 to see them here.
          </p>
        </section>
      )}

      {latest && (
        <>
          {/* Current grip status */}
          <section style={cardStyle}>
            <p style={mutedStyle}>Current sensor status</p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: statusColor,
                  flexShrink: 0,
                }}
              />

              <h4
                style={{
                  color: statusColor,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                {statusLabel}
              </h4>
            </div>

            <p style={{ ...mutedStyle, marginTop: '0.75rem' }}>
              This status indicates whether readings are arriving and
              whether the raw pressure values are above zero. It is
              not yet a calibrated assessment of bowling grip quality.
            </p>
          </section>

          {/* Device and session details */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {[
              {
                label: 'Registered device',
                value: latest.device_name,
              },
              {
                label: 'Bowling session',
                value:
                  latest.session_name ??
                  `Session ${latest.session_id}`,
              },
              {
                label: 'Session started',
                value: formatDate(latest.started_at),
              },
              {
                label: 'Latest reading',
                value: formatDate(latest.received_at),
              },
            ].map((item) => (
              <div key={item.label} style={cardStyle}>
                <p style={mutedStyle}>{item.label}</p>
                <p
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    marginTop: '0.5rem',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          {/* Three pressure sensors */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '1.1rem',
                marginBottom: '0.4rem',
              }}
            >
              Grip pressure details
            </h4>

            <p style={mutedStyle}>
              Latest raw values recorded by the three pressure sensors.
            </p>

            <div
              style={{
                display: 'grid',
                gap: '1.25rem',
                marginTop: '1.5rem',
              }}
            >
              {pressureSensors.map((sensor) => {
                const relativeLevel =
                  (sensor.value / maxPressure) * 100;

                return (
                  <div key={sensor.name}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {sensor.name}
                      </span>

                      <strong
                        style={{
                          color: 'var(--text-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {sensor.value}
                        <span
                          style={{
                            ...mutedStyle,
                            marginLeft: '0.35rem',
                          }}
                        >
                          raw
                        </span>
                      </strong>
                    </div>

                    <div
                      role="progressbar"
                      aria-label={`${sensor.name} relative raw reading`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={relativeLevel}
                      style={{
                        height: '9px',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        background: 'var(--border)',
                      }}
                    >
                      <div
                        style={{
                          width: `${relativeLevel}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: 'var(--accent-secondary)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    <p style={{ ...mutedStyle, marginTop: '0.4rem' }}>
                      {sensor.calibrated !== null &&
                      sensor.calibrated !== undefined
                        ? `Calibrated value: ${numeric(sensor.calibrated)} Pa`
                        : 'Calibrated pressure: unavailable'}
                    </p>
                  </div>
                );
              })}
            </div>

            <p style={{ ...mutedStyle, marginTop: '1.25rem' }}>
              The bars compare the three raw readings with one another.
              They are not percentages of maximum sensor capacity.
            </p>
          </section>

          {/* IMU details */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '1.1rem',
                marginBottom: '0.4rem',
              }}
            >
              IMU sensor details
            </h4>

            <p style={mutedStyle}>
              Latest accelerometer and gyroscope readings from both IMUs.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginTop: '1rem',
              }}
            >
              {[
                {
                  name: 'IMU 1',
                  acceleration: [
                    latest.imu1_ax,
                    latest.imu1_ay,
                    latest.imu1_az,
                  ],
                  gyroscope: [
                    latest.imu1_gx,
                    latest.imu1_gy,
                    latest.imu1_gz,
                  ],
                },
                {
                  name: 'IMU 2',
                  acceleration: [
                    latest.imu2_ax,
                    latest.imu2_ay,
                    latest.imu2_az,
                  ],
                  gyroscope: [
                    latest.imu2_gx,
                    latest.imu2_gy,
                    latest.imu2_gz,
                  ],
                },
              ].map((imu) => (
                <div
                  key={imu.name}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <h5
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {imu.name}
                  </h5>

                  <p style={mutedStyle}>Accelerometer (X, Y, Z)</p>

                  <p
                    style={{
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                      overflowWrap: 'anywhere',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {imu.acceleration
                      .map((value) => numeric(value).toFixed(3))
                      .join(', ')}
                  </p>

                  <p style={mutedStyle}>Gyroscope (X, Y, Z)</p>

                  <p
                    style={{
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {imu.gyroscope
                      .map((value) => numeric(value).toFixed(3))
                      .join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent readings */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '1.1rem',
                marginBottom: '0.4rem',
              }}
            >
              Recent grip readings
            </h4>

            <p style={mutedStyle}>
              Latest {history.length} records retrieved from PostgreSQL.
            </p>

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {[
                      'Received at',
                      'Sample',
                      'Sensor 1',
                      'Sensor 2',
                      'Sensor 3',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {history.map((reading) => (
                    <tr key={reading.id}>
                      <td
                        style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(reading.received_at)}
                      </td>

                      <td
                        style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {reading.sample_index}
                      </td>

                      {[
                        reading.pressure1_raw,
                        reading.pressure2_raw,
                        reading.pressure3_raw,
                      ].map((value, index) => (
                        <td
                          key={index}
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--border)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {numeric(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}