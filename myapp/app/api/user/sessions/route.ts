import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

function authenticate(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  return token ? verifyToken(token) : null;
}

// GET /api/user/sessions — the user's finished sessions, newest first
export async function GET(req: NextRequest) {
  const payload = authenticate(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT session_no, started_at, ended_at, deliveries_count,
              avg_speed::float AS avg_speed,
              max_speed::float AS max_speed,
              min_speed::float AS min_speed
       FROM speed_sessions
       WHERE user_id = $1 AND ended_at IS NOT NULL AND deliveries_count > 0
       ORDER BY started_at DESC
       LIMIT 100`,
      [payload.userId]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// POST /api/user/sessions — start a live session. The glove's readings are stored
// against the user's open session, so there is at most one open session per user:
// if one is already open (e.g. the page was reloaded) it is returned instead.
export async function POST(req: NextRequest) {
  const payload = authenticate(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the user's row so two starts at once can't pick the same session number.
    const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [payload.userId]);
    if (user.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const open = await client.query(
      `SELECT session_no, started_at
       FROM speed_sessions
       WHERE user_id = $1 AND ended_at IS NULL
       ORDER BY session_no DESC
       LIMIT 1`,
      [payload.userId]
    );
    if (open.rows.length > 0) {
      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        data: { sessionNo: open.rows[0].session_no, startedAt: open.rows[0].started_at },
      });
    }

    const created = await client.query(
      `INSERT INTO speed_sessions (user_id, session_no)
       SELECT $1, COALESCE(MAX(session_no), 0) + 1
       FROM speed_sessions
       WHERE user_id = $1
       RETURNING session_no, started_at`,
      [payload.userId]
    );
    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        data: { sessionNo: created.rows[0].session_no, startedAt: created.rows[0].started_at },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start session error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
