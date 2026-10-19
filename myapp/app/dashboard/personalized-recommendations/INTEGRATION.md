# Performance frontend integration

Open **Dashboard → Personalized Recommendations → Get Recommendations**.
Choose **Select Time Period** for general recommendations, or **Start a Session →
Review recorded sessions** for ball instructions. **Preview Start Session** is
only a preview and never starts device recording. The completed-session panel is
available under **Start a Session → Completed session analysis**.
`demo-data.ts` now exports an empty session array; no sample records are supplied.
Session/report selections start empty, and the local report generator has been
removed. Connect recorded sessions and backend-supplied reports before enabling
completed-session analysis. Missing averages display an em dash rather than zero.
The period and ball-instruction views continue to display backend results only;
they never generate recommendations, classifications, or contribution percentages.

## Existing endpoint reused

`GET /api/user/profile` supplies `data.id` for the signed-in player. Requests use
the existing HttpOnly authentication cookie, `credentials: 'same-origin'`, and
`cache: 'no-store'`. No tokens are read or stored by the frontend.

## Required future endpoints

Implement these authenticated, same-origin endpoints in the backend when the
separately trained model and actual performance records are ready. The frontend
adapter is `performance-api.ts`; change its paths or mapping if the eventual
backend contract differs. No backend, database, model, or dependency changes are
included in this frontend work.

| GET endpoint | Query parameters | Successful `data` |
| --- | --- | --- |
| `/api/performance/recommendations` | `playerId`, `startDate`, `endDate` | `PeriodRecommendations` or `null` when no records exist |
| `/api/performance/sessions` | `playerId` | `{ playerId: number, sessions: PerformanceSession[] }` |
| `/api/performance/sessions/{sessionId}/instructions` | `playerId` | `SessionInstructionsResult` containing every recorded ball |

All successful responses use `{ success: true, data: ... }`, matching the existing
profile endpoint. Types and runtime checks live in `performance-api.ts`:

- `PeriodRecommendations`: authenticated `playerId`, `period.startDate`,
  `period.endDate`, nonnegative integer `sessionCount` and `ballCount`, `summary`,
  `grip`, `wristAngle`, `priorityArea`, and `recommendations: string[]`.
  `grip` and `wristAngle` each contain `status` and `summary: string | null`.
  `priorityArea` is `grip`, `wrist`, `both`, `none`, or `unavailable`.
  Optional `contributions` is `{ grip: number, wristAngle: number }` or `null`.
  Supply finite percentages from 0 through 100 only when validated by the
  backend/model. Missing or invalid estimates are omitted from the display;
  the frontend never calculates a complement, normalizes, or invents estimates.
- `PerformanceSession`: unique string `id`, display `label`, ISO `startedAt`,
  and nonnegative integer `ballCount`. Return `sessions: []` for no sessions.
- `SessionInstructionsResult`: authenticated `playerId`, exact requested
  `sessionId`, and `balls: BallInstruction[]`. Each ball has a unique positive
  integer `ballNumber`, `gripStatus`, `wristAngleStatus`, and
  `instruction: string | null`. Return `balls: []` for an empty session. Ball
  numbers come from records, are sorted for display, and are never renumbered.
- Every technique status is `correct`, `incorrect`, or `unavailable`. Use
  `unavailable` and `null` summaries/instructions for missing measurements or
  failed predictions. Return short model-supplied instructions for individual
  balls; do not put overall reports in the instruction field.

Dates are ISO calendar dates (`YYYY-MM-DD`) in UTC, inclusive at both ends. The
backend must restrict records to the authenticated player and the interval
`[startDate at 00:00 UTC, day after endDate at 00:00 UTC)`. Echo the exact selected
dates in `data.period`. The frontend checks the echoed dates and player/session
identity before displaying a result.

The backend **must verify the existing JWT cookie and enforce ownership** for
sessions, balls, and period records. A query parameter is not authorization;
derive the authoritative player ID from the verified cookie and reject any
mismatch. Frontend response checks do not replace backend access control.

## Unavailable data and interaction

- Missing endpoints (404/501) and unavailable services/models (503 or
  `{ success: false, code: 'MODEL_UNAVAILABLE' }`) show an unavailable state.
- 401 asks the player to sign in again; 403 displays an access error. Network
  failures, other HTTP failures, and malformed responses display an error with
  retry controls. Each HTTP request times out after 15 seconds.
- The period view requests results automatically after valid date changes
  (250 ms debounce). Previous selections are hidden immediately; canceled or
  out-of-order responses cannot replace the current selection.
- Selecting a session retrieves all its ball instructions. Ball selection and
  previous/next controls display the matching record without another request.
  **Refresh instructions** retrieves new or updated ball records; **Refresh
  sessions** reloads the recorded session list. There is no fabricated fallback
  or background polling.

## Verification

From `myapp`, run `npx tsc --noEmit` and `npm run build` (`npx.cmd`/`npm.cmd` in
PowerShell if script execution is restricted).

Until the endpoints are connected, the two views should show unavailable states.
After connecting them, sign in normally and verify:

1. Two different date ranges send their exact dates and the current player ID;
   returned summaries change accordingly. Reversed dates show validation and
   send no performance request. Same-day ranges are allowed.
2. Null/zero-record periods and empty session/ball lists show empty states.
3. Grip-only, wrist-only, combined, and correct statuses display exactly the
   supplied summaries/instructions. Missing estimates show no percentage bars.
4. Session and ball selection keep each instruction attached to its actual ball
   number, including nonconsecutive numbers. Refresh picks up added balls.
5. Wrong-player, wrong-period, wrong-session, duplicate-ball, and malformed
   responses are rejected. Test authorization separately on the backend.
6. Delayed requests, selection changes, HTTP failures, unavailable models, and
   retries recover without stale results or indefinite loading.
7. Test narrow mobile and desktop layouts and confirm the existing recommendation
   navigation and other dashboard features still work.
