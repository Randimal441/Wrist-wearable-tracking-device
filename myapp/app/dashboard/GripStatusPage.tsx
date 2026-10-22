
'use client';

import { useCallback, useEffect, useState } from 'react';

const MAX_RAW = 4095;

interface GripReading {
  id: number | string;
  delivery_id?: number | string | null;
  created_at: string;
  start_timestamp_ms?: number | string | null;
  end_timestamp_ms?: number | string | null;

  start_pressure1_raw: number | string | null;
  start_pressure2_raw: number | string | null;
  start_pressure3_raw: number | string | null;

  end_pressure1_raw: number | string | null;
  end_pressure2_raw: number | string | null;
  end_pressure3_raw: number | string | null;

  wrist_angle_start_deg?: number | string | null;
  wrist_angle_release_deg?: number | string | null;
}

interface GripApiResponse {
  success: boolean;
  message?: string;
  data?: {
    latest: GripReading | null;
    history: GripReading[];
  };
}

function rawValue(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  return Math.min(MAX_RAW, Math.max(0, parsed));
}

function toPercentage(value: number | null): number | null {
  return value === null ? null : (value / MAX_RAW) * 100;
}

function formatPercentage(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : date.toLocaleString();
}

function getPressureValues(reading: GripReading) {
  return [
    toPercentage(rawValue(reading.end_pressure1_raw)),
    toPercentage(rawValue(reading.end_pressure2_raw)),
    toPercentage(rawValue(reading.end_pressure3_raw)),
  ];
}

function hasCompleteReleasePressure(reading: GripReading): boolean {
  return [
    reading.end_pressure1_raw,
    reading.end_pressure2_raw,
    reading.end_pressure3_raw,
  ].every((value) => rawValue(value) !== null);
}

function getAveragePressure(reading: GripReading | null): number | null {
  if (!reading || !hasCompleteReleasePressure(reading)) return null;

  const values = getPressureValues(reading);

  if (values.some((value) => value === null)) return null;

  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 3;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '1.25rem',
  minWidth: 0,
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  lineHeight: 1.6,
};

function PressureBar({
  label,
  raw,
  percentage,
}: {
  label: string;
  raw: number | null;
  percentage: number | null;
}) {
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {label}
        </span>
        <strong style={{ color: 'var(--text-primary)' }}>
          {formatPercentage(percentage)}
        </strong>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage ?? 0}
        style={{
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--border)',
        }}
      >
        <div
          style={{
            width: `${percentage ?? 0}%`,
            height: '100%',
            borderRadius: 999,
            background: '#16A34A',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <span style={{ ...mutedStyle, fontSize: '0.8rem' }}>
        Raw value: {raw === null ? 'Unavailable' : raw} / {MAX_RAW}
      </span>
    </div>
  );
}

/**
 * Live schematic of the three pressure sensor locations.
 * Marker size and intensity update with the latest release readings.
 */
function GripPressureDiagram({
  pressures,
}: {
  pressures: [number | null, number | null, number | null];
}) {
  const sensors = [
    { label: 'S1', name: 'Sensor 1', x: 104, y: 115, value: pressures[0] },
    { label: 'S2', name: 'Sensor 2', x: 190, y: 165, value: pressures[1] },
    { label: 'S3', name: 'Sensor 3', x: 138, y: 235, value: pressures[2] },
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '0.5rem',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <svg
          viewBox="0 0 300 330"
          role="img"
          aria-label="Live schematic showing three pressure sensor readings"
          style={{ width: '100%', maxWidth: 330, height: 'auto' }}
        >
          <defs>
            <linearGradient id="liveGloveFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0.30" />
            </linearGradient>
          </defs>

          <text
            x="150"
            y="24"
            textAnchor="middle"
            fontSize="12"
            fill="var(--text-muted)"
          >
            LIVE GRIP PRESSURE
          </text>

          <path
            d="
              M 90 278
              L 72 228
              Q 66 213 75 204
              Q 85 196 94 212
              L 108 240
              L 91 154
              Q 88 139 101 134
              Q 114 130 119 147
              L 134 204
              L 126 95
              Q 125 78 140 77
              Q 155 77 157 94
              L 168 194
              L 177 112
              Q 179 96 192 99
              Q 205 102 203 117
              L 199 206
              L 216 156
              Q 222 141 234 148
              Q 246 155 240 169
              L 216 247
              Q 209 275 189 289
              L 119 300
              Q 101 296 90 278 Z
            "
            fill="url(#liveGloveFill)"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <path
            d="M 105 267 Q 145 282 201 252"
            fill="none"
            stroke="var(--text-muted)"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {sensors.map((sensor) => {
            const value = sensor.value;
            const radius = value === null ? 15 : 14 + (value / 100) * 9;
            const textColor =
              value !== null && value >= 48 ? '#FFFFFF' : 'var(--text-primary)';

            return (
              <g key={sensor.label}>
                <circle
                  cx={sensor.x}
                  cy={sensor.y}
                  r={radius + 6}
                  fill={value === null ? '#94A3B8' : '#16A34A'}
                  opacity={
                    value === null ? 0.05 : 0.08 + (value / 100) * 0.2
                  }
                />

                <circle
                  cx={sensor.x}
                  cy={sensor.y}
                  r={radius}
                  fill={value === null ? '#94A3B8' : '#16A34A'}
                  fillOpacity={
                    value === null ? 0.35 : 0.3 + (value / 100) * 0.7
                  }
                  stroke={value === null ? '#94A3B8' : '#15803D'}
                  strokeWidth="2"
                  style={{ transition: 'all 0.4s ease' }}
                />

                <text
                  x={sensor.x}
                  y={sensor.y - 2}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={textColor}
                >
                  {sensor.label}
                </text>

                <text
                  x={sensor.x}
                  y={sensor.y + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill={textColor}
                >
                  {value === null ? '—' : `${value.toFixed(0)}%`}
                </text>
              </g>
            );
          })}

          <text
            x="150"
            y="320"
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-muted)"
          >
            Sensor positions are schematic
          </text>
        </svg>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.5rem',
        }}
      >
        {sensors.map((sensor) => (
          <div
            key={sensor.label}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '0.65rem',
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <p style={{ ...mutedStyle, fontSize: '0.75rem' }}>
              {sensor.name}
            </p>
            <strong
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
              }}
            >
              {formatPercentage(sensor.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AverageComparisonChart({
  previous,
  newest,
}: {
  previous: number | null;
  newest: number | null;
}) {
  const change =
    previous !== null && newest !== null ? newest - previous : null;

  const changeColor =
    change === null
      ? 'var(--text-muted)'
      : change > 0
        ? '#16A34A'
        : change < 0
          ? 'var(--accent-secondary)'
          : 'var(--text-primary)';

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
        }}
      >
        {[
          { label: 'Previous delivery', value: previous, fill: '#64748B' },
          { label: 'Newest delivery', value: newest, fill: '#16A34A' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '1rem',
              minWidth: 0,
            }}
          >
            <p style={mutedStyle}>{item.label}</p>

            <strong
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.8rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatPercentage(item.value)}
            </strong>

            <div
              style={{
                height: 12,
                background: 'var(--border)',
                borderRadius: 999,
                overflow: 'hidden',
                marginTop: '0.8rem',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${item.value ?? 0}%`,
                  background: item.fill,
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '1rem',
        }}
      >
        <p style={mutedStyle}>Average pressure change</p>

        <strong
          style={{
            display: 'block',
            color: changeColor,
            fontSize: '1.8rem',
            margin: '0.35rem 0',
          }}
        >
          {change === null
            ? '—'
            : `${change > 0 ? '+' : ''}${change.toFixed(1)} pp`}
        </strong>

        <p style={mutedStyle}>
          {change === null
            ? 'Two complete deliveries are required for comparison.'
            : change > 0
              ? 'The newest delivery has a higher average normalized pressure reading.'
              : change < 0
                ? 'The newest delivery has a lower average normalized pressure reading.'
                : 'The average normalized pressure reading is unchanged.'}
        </p>
      </div>
    </div>
  );
}

export default function GripStatusPage() {
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
          result.message ?? 'Could not load delivery pressure data.'
        );
      }

      setHistory(result.data?.history ?? []);
      setError('');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load delivery pressure data.'
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

  const completeDeliveries = history
    .filter(hasCompleteReleasePressure)
    .slice()
    .sort((a, b) => {
      const dateDifference =
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime();

      return dateDifference !== 0
        ? dateDifference
        : Number(b.id) - Number(a.id);
    });

  const newestDelivery = completeDeliveries[0] ?? null;
  const previousDelivery = completeDeliveries[1] ?? null;

  const latestRaw1 = rawValue(newestDelivery?.end_pressure1_raw);
  const latestRaw2 = rawValue(newestDelivery?.end_pressure2_raw);
  const latestRaw3 = rawValue(newestDelivery?.end_pressure3_raw);

  const pressure1 = toPercentage(latestRaw1);
  const pressure2 = toPercentage(latestRaw2);
  const pressure3 = toPercentage(latestRaw3);

  const newestAverage = getAveragePressure(newestDelivery);
  const previousAverage = getAveragePressure(previousDelivery);

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'grid', gap: '1.25rem' }}
    >
      {/* Header */}
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
              Monitor live delivery pressure and compare your latest grips.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadGripData()}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0.65rem 1rem', borderRadius: 8 }}
          >
            {loading ? 'Loading…' : 'Refresh readings'}
          </button>
        </div>

        <p style={{ ...mutedStyle, marginTop: '0.75rem' }}>
          Auto-refreshes every 5 seconds.
          {lastUpdated ? ` Last checked: ${lastUpdated}` : ''}
        </p>
      </section>

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

      {!loading && !error && !newestDelivery && (
        <section style={cardStyle}>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            No completed deliveries yet
          </h4>
          <p style={mutedStyle}>
            Complete a delivery with the ESP32. The release-point pressure
            readings will appear here after they are saved in
            delivery_sensor_summary.
          </p>
        </section>
      )}

      {newestDelivery && (
        <>
          {/* Newest delivery on the left; live diagram on the right */}
          <section style={cardStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              {/* Left side: delivery information */}
              <div style={{ minWidth: 0 }}>
                <span className="eyebrow">LATEST COMPLETED DELIVERY</span>

                <h4
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    margin: '0.5rem 0',
                  }}
                >
                  Delivery #{newestDelivery.delivery_id ?? '—'}
                </h4>

                <p style={mutedStyle}>
                  {formatDate(newestDelivery.created_at)}
                </p>

                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <p style={mutedStyle}>Average release-point pressure</p>

                  <strong
                    style={{
                      display: 'block',
                      color: 'var(--text-primary)',
                      fontSize: '2.6rem',
                      lineHeight: 1.25,
                      margin: '0.5rem 0 1rem',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatPercentage(newestAverage)}
                  </strong>

                  <div
                    role="progressbar"
                    aria-label="Average release-point pressure"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={newestAverage ?? 0}
                    style={{
                      height: 12,
                      borderRadius: 999,
                      overflow: 'hidden',
                      background: 'var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: `${newestAverage ?? 0}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: '#16A34A',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <p style={{ ...mutedStyle, marginTop: '0.75rem' }}>
                    Average of the three release-point pressure percentages.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '0.75rem',
                    marginTop: '1rem',
                  }}
                >
                  <div
                    style={{
                      padding: '0.85rem',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                    }}
                  >
                    <p style={mutedStyle}>Previous average</p>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                      {formatPercentage(previousAverage)}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: '0.85rem',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                    }}
                  >
                    <p style={mutedStyle}>Newest average</p>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                      {formatPercentage(newestAverage)}
                    </strong>
                  </div>
                </div>

                <p style={{ ...mutedStyle, marginTop: '1rem' }}>
                  Device start timestamp:{' '}
                  {newestDelivery.start_timestamp_ms ?? 'Unavailable'} ms
                </p>

                <p style={mutedStyle}>
                  Device release timestamp:{' '}
                  {newestDelivery.end_timestamp_ms ?? 'Unavailable'} ms
                </p>
              </div>

              {/* Right side: live diagram */}
              <div style={{ minWidth: 0 }}>
                <h4
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '0.4rem',
                  }}
                >
                  Visual Grip Pressure Map
                </h4>

                <p style={{ ...mutedStyle, marginBottom: '1rem' }}>
                  Live view of the newest delivery's release-point pressure.
                  Marker size and intensity change with the sensor readings.
                </p>

                <GripPressureDiagram
                  pressures={[pressure1, pressure2, pressure3]}
                />

                <p style={{ ...mutedStyle, marginTop: '0.75rem' }}>
                  Sensor layout is illustrative, not an anatomically calibrated
                  map. Values show normalized ADC range, not physical force.
                </p>
              </div>
            </div>
          </section>

          {/* Overall previous vs newest comparison */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: '0.4rem',
              }}
            >
              Last Grip vs Newest Delivery
            </h4>

            <p style={mutedStyle}>
              Compare overall average release-point pressure. This section does
              not compare the sensors individually.
            </p>

            {!previousDelivery ? (
              <p style={{ ...mutedStyle, marginTop: '1rem' }}>
                Complete another delivery with all three release pressure
                readings to see the comparison.
              </p>
            ) : (
              <AverageComparisonChart
                previous={previousAverage}
                newest={newestAverage}
              />
            )}

            <p style={{ ...mutedStyle, marginTop: '1rem' }}>
              An increase or decrease indicates a change in normalized sensor
              output; it does not by itself establish improved bowling technique.
            </p>
          </section>

          {/* Individual readings for newest delivery */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
                fontWeight: 700,
                marginBottom: '0.4rem',
              }}
            >
              Individual Release-Point Readings
            </h4>

            <p style={mutedStyle}>
              Raw values and normalized percentages for the newest delivery.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
              <PressureBar
                label="Pressure Sensor 1"
                raw={latestRaw1}
                percentage={pressure1}
              />

              <PressureBar
                label="Pressure Sensor 2"
                raw={latestRaw2}
                percentage={pressure2}
              />

              <PressureBar
                label="Pressure Sensor 3"
                raw={latestRaw3}
                percentage={pressure3}
              />
            </div>
          </section>

          {/* Delivery history */}
          <section style={cardStyle}>
            <h4
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                marginBottom: '0.4rem',
              }}
            >
              Recent Release-Point Readings
            </h4>

            <p style={mutedStyle}>
              Completed deliveries with all three release-point readings.
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
                      'Created at',
                      'Delivery ID',
                      'Sensor 1',
                      'Sensor 2',
                      'Sensor 3',
                      'Average',
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
                  {completeDeliveries.map((reading) => {
                    const [p1, p2, p3] = getPressureValues(reading);
                    const average = getAveragePressure(reading);

                    return (
                      <tr key={reading.id}>
                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--border)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(reading.created_at)}
                        </td>

                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                          {reading.delivery_id ?? '—'}
                        </td>

                        {[p1, p2, p3].map((value, index) => (
                          <td
                            key={index}
                            style={{
                              padding: '0.75rem',
                              borderBottom: '1px solid var(--border)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatPercentage(value)}
                          </td>
                        ))}

                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--border)',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatPercentage(average)}
                        </td>
                      </tr>
                    );
                  })}

                  {completeDeliveries.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: '1rem', color: 'var(--text-muted)' }}
                      >
                        No complete delivery readings are available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
