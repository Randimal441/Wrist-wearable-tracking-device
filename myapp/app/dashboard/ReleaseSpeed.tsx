'use client';

import { useEffect, useState } from 'react';

export interface ReleaseSpeedRow {
    deliveryId: string;
    speedKmh: number;
    aMagG: number;
    saturated: boolean;
    armLengthM: number;
    releasedAt: string;
    sessionNo: number | null;
    ballNo: number | null;
}

export interface ReleaseSpeedsData {
    armLengthRequired: boolean;
    armLengthM: number | null;
    accelRangeG: number;
    deliveries: ReleaseSpeedRow[];
}

const POLL_MS = 2000;

// The user's most recent deliveries (newest first) with their release speed, refreshed while
// the page is open so a new delivery from the glove shows up without reloading.
export function useReleaseSpeeds(limit = 1) {
    const [data, setData] = useState<ReleaseSpeedsData | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(`/api/user/delivery-speeds?limit=${limit}`)
                .then((res) => res.json())
                .then((json) => {
                    if (cancelled) return;
                    if (json.success) {
                        setData(json.data);
                        setFailed(false);
                    } else {
                        setFailed(true);
                    }
                })
                .catch(() => { if (!cancelled) setFailed(true); });
        };
        load();
        const timer = setInterval(load, POLL_MS);
        return () => { cancelled = true; clearInterval(timer); };
    }, [limit]);

    return { data, failed };
}

export function ReleaseSpeedPanel({
    data,
    failed,
    onGoToProfile,
}: {
    data: ReleaseSpeedsData | null;
    failed: boolean;
    onGoToProfile: () => void;
}) {
    const latest = data?.deliveries[0];

    return (
        <section className="wrist-section glass-card speed-release-panel" aria-labelledby="release-speed-title">
            <div className="wrist-section-heading">
                <div>
                    <span className="eyebrow">Release speed / wrist accelerometer</span>
                    <h4 id="release-speed-title">Speed at ball release</h4>
                    <p>
                        Your latest ball, calculated from the glove&apos;s reading at the moment of release and your arm length.
                        Earlier deliveries are in Speed Status.
                    </p>
                </div>
                {latest && (
                    <span className="badge badge-teal">
                        {latest.sessionNo !== null ? `Session #${latest.sessionNo} · ball ${latest.ballNo}` : 'Not in a session'}
                    </span>
                )}
            </div>

            {failed && !data && <p className="empty-history" style={{ color: 'var(--accent-red)' }}>Could not load your release speeds.</p>}
            {!failed && !data && <p className="empty-history">Loading release speeds…</p>}

            {data?.armLengthRequired && (
                <div className="speed-release-notice">
                    <p>Please update your arm length in your profile to see your release speed.</p>
                    <button type="button" className="btn-primary" onClick={onGoToProfile}>Go to profile</button>
                </div>
            )}

            {data && !data.armLengthRequired && !latest && (
                <p className="empty-history">No deliveries yet. Your release speed appears here after the glove sends a delivery.</p>
            )}

            {data && latest && (
                <>
                    <div className="speed-live-metrics">
                        <div className="baseline-metric baseline-teal">
                            <span>Release speed</span>
                            <strong>{latest.saturated ? '≥ ' : ''}{latest.speedKmh.toFixed(1)} km/h</strong>
                            <em>Delivery {latest.deliveryId}</em>
                        </div>
                        <div className="baseline-metric baseline-purple">
                            <span>Acceleration at release</span>
                            <strong>{latest.aMagG.toFixed(2)} g</strong>
                            <em>a_mag from imu2</em>
                        </div>
                        <div className="baseline-metric baseline-orange">
                            <span>Arm length</span>
                            <strong>{latest.armLengthM.toFixed(2)} m</strong>
                            <em>From your profile</em>
                        </div>
                        <div className="baseline-metric baseline-green">
                            <span>Sensor range</span>
                            <strong>±{data.accelRangeG} g</strong>
                            <em>Default</em>
                        </div>
                    </div>

                    {latest.saturated && (
                        <p className="speed-release-warning" role="status">
                            The accelerometer reached its ±{data.accelRangeG} g limit at release, so your real speed is higher than shown.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
