# Phase F6 Security Audit — Studio AI

Date: 2026-08-31  
Auditor: Security sub-agent  
Scope: StudioWorkspace, offline drafts (IndexedDB), studio API client, chat/generate integration

**Files reviewed**

- `client/src/components/studio/StudioWorkspace.tsx`
- `client/src/lib/db/drafts.ts`, `schema.ts`, `purge.ts`
- `client/src/lib/api/studio.ts`
- `client/src/providers/AuthProvider.tsx` (logout purge)
- Backend cross-ref: `backend/docs/security/phase-6-audit.md`

## 1. Vulnerability Summary

| Severity | Count | Open | Fixed | Deferred |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 2 | 0 |
| Medium | 2 | 1 | 1 | 0 |
| Low | 1 | 1 | 0 | 0 |

**Overall:** PASS (Critical/High remediated)

## 2. Detailed Findings

### SEV-F601 — IndexedDB drafts not scoped to user (High) — FIXED

- **Severity:** High
- **Component:** `lib/db/drafts.ts`, `lib/db/schema.ts`, `StudioWorkspace.tsx`
- **Description:** Studio drafts stored in IndexedDB keyed only by `designId` with no `ownerId`. On a shared device, User A's panel artwork persisted after logout and could be offered for restore when User B opened a design with the same id (UUID collision astronomically unlikely) or via forensic access to `index.db`.
- **Exploitation:** User A edits design offline → logs out without syncing → User B logs in on same browser → IndexedDB still holds User A's panel JSON until manually cleared.
- **Impact:** Confidentiality — design IP leak on shared workstations
- **Fix:** Added `ownerId` to `DesignDraft`; `getDraft(designId, ownerId)` returns undefined on owner mismatch; `makeDraft` requires session user id; draft save skipped when no session.
- **Status:** fixed

### SEV-F602 — Local drafts persist after logout (High) — FIXED

- **Severity:** High
- **Component:** `AuthProvider.tsx`, `lib/db/purge.ts`
- **Description:** Logout cleared React Query but not IndexedDB `drafts` or legacy `orders` stores. Next user on same browser inherited local studio state.
- **Exploitation:** Admin/creator logs out at kiosk → next visitor opens studio → stale drafts/orders readable in DevTools Application tab.
- **Impact:** Confidentiality — local data remnant after session end
- **Fix:** `clearLocalUserData()` clears `drafts` and `orders` object stores on logout, failed logout, and account switch.
- **Status:** fixed

### SEV-F603 — Draft restore prompt without explicit ownership check (Medium) — FIXED

- **Severity:** Medium
- **Component:** `StudioWorkspace.tsx` draft-restore effect
- **Description:** Restore logic compared draft vs server timestamps but did not verify draft belonged to current session user.
- **Exploitation:** Chained with SEV-F601 on shared device.
- **Impact:** Confidentiality — unintended panel restore
- **Fix:** Subsumed by owner-scoped `getDraft`; effect waits for `ownerId` before running.
- **Status:** fixed

### SEV-F604 — Chat history rendered from API without sanitization (Medium) — OPEN

- **Severity:** Medium
- **Component:** `StudioWorkspace.tsx` chat display
- **Description:** Chat messages from API rendered as plain text in `<p>` tags. Backend allows PATCH of `chat` with assistant role (backend SEV-606). XSS risk is low with React text escaping but assistant spoofing affects UX integrity.
- **Exploitation:** PATCH design with forged assistant message → displayed as legitimate in studio.
- **Impact:** Integrity — social engineering in studio UI
- **Fix:** Backend should restrict `chat` writes to server paths; client could filter `role === 'assistant'` from PATCH responses
- **Status:** open (deferred: backend SEV-606)

### SEV-F605 — Offline studio disables chat but still saves drafts (Low) — VERIFIED OK

- **Severity:** N/A (intended behavior)
- **Component:** `StudioWorkspace.tsx`
- **Description:** Chat/generate disabled when `!online`; local draft debounce continues. Matches product spec; drafts are user-scoped post-fix.
- **Status:** fixed (by design)

## 3. Attack Chains

1. **Shared kiosk draft leak** — User A offline edit → logout (pre-fix: draft remains) → User B login → pre-fix could read drafts in IDB; post-fix: purge on logout + ownerId gate.
2. **Cross-user design chat** — Blocked server-side by `OwnershipGuard` (backend SEV-604 verified).
3. **Rate-limit abuse** — Backend throttlers `studio-chat` / `studio-generate` (backend SEV-601 fixed); client shows 429 message via `studioApiMessage()`.

## 4. Controls Verified

- Chat/generate API calls require authenticated session (dashboard auth gate)
- Draft save requires `session.id`
- Logout purges local IndexedDB user data
- Offline mode blocks network AI calls
- Backend ownership + rate limits on studio endpoints

## 5. Secure Design Recommendations

- Encrypt sensitive draft payloads at rest in IndexedDB (Web Crypto + session-derived key)
- Auto-clear drafts older than N days on app boot
- Display session indicator on studio when local draft exists
- Migrate generate polling to visibility-aware backoff to reduce fingerprinting
