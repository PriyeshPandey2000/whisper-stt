# Anonymous Auth Testing Checklist

**Created:** 2025-12-25
**Purpose:** Verify anonymous auth implementation doesn't break existing functionality

## Critical Flow Tests

### 1. Fresh Install (New User)

**Expected Flow:**
```
Install app → Launch → Onboarding appears → Anonymous session created IMMEDIATELY →
Complete onboarding → Can record/transcribe/paste → Hit 5 min limit → Signup modal →
Sign up → All data preserved
```

**Test Steps:**
- [ ] Clear all app data: `rm -rf ~/Library/Application\ Support/com.epicenter.noteflux/*`
- [ ] Launch app
- [ ] Verify onboarding appears
- [ ] **Check console:** "Anonymous session created for onboarding" appears BEFORE onboarding shows
- [ ] **Check localStorage:** Should have `sb-` keys immediately
- [ ] During onboarding, press global shortcut to record
- [ ] Verify recording indicator appears
- [ ] Stop recording
- [ ] Verify transcription happens (not just "...")
- [ ] Verify text pastes into onboarding text area
- [ ] Complete all onboarding steps
- [ ] Make 3-5 more recordings after onboarding
- [ ] Verify all recordings are saved and visible
- [ ] Check Supabase `total_usage_limit` table - should see row with `email = "unknown"`

**Edge Cases:**
- [ ] What if Supabase is down when creating anonymous session? (Should show error, block onboarding?)
- [ ] What if anonymous auth is disabled in Supabase? (Check error handling)
- [ ] What if user force-quits during onboarding? (Session persists on relaunch?)

---

### 2. Existing User (Already Completed Onboarding)

**Expected Flow:**
```
Launch app → No onboarding → Existing session loads → Can record normally
```

**Test Steps:**
- [ ] Don't clear app data (use existing user)
- [ ] Launch app
- [ ] Verify onboarding does NOT appear
- [ ] Verify existing session is still valid
- [ ] **Check console:** No "Anonymous session created" message
- [ ] Make a recording
- [ ] Verify it works as before
- [ ] Check recordings list - all old recordings still there

**Edge Cases:**
- [ ] User with existing permanent account - does anonymous logic skip?
- [ ] User already signed in - no anonymous session created?

---

### 3. Permissions Re-Prompt Flow

**Expected Flow:**
```
User has completed onboarding but permissions revoked → Launch → Onboarding re-appears
at permissions step → Anonymous session already exists → Can still test recording
```

**Test Steps:**
- [ ] Complete onboarding once (anonymous session created)
- [ ] Go to macOS System Settings → Privacy → Microphone → Revoke permission
- [ ] Relaunch app
- [ ] Verify onboarding appears at "Permissions" step (not welcome)
- [ ] **Check:** Does it try to create ANOTHER anonymous session? (Should skip - already authenticated)
- [ ] Grant permissions
- [ ] Complete onboarding
- [ ] Verify same session persists (no duplicate)

---

### 4. Anonymous User Hits 5-Minute Gate

**Expected Flow:**
```
Anonymous user with 5+ minutes → Try to record → Recording blocked →
Signup modal appears (non-dismissible) → Sign up → Session converts →
All recordings preserved → Can record again
```

**Test Steps:**
- [ ] As anonymous user, make recordings (or manually set usage to 5 min)
- [ ] In Supabase SQL: `UPDATE total_usage_limit SET total_minutes = 5.0 WHERE user_id = auth.uid();`
- [ ] **Switch to another app** (e.g., Notes, Chrome)
- [ ] Press global shortcut to record
- [ ] **Verify:** Recording does NOT start
- [ ] **Verify:** NoteFlux window comes to front automatically ✨
- [ ] **Verify:** Signup modal is visible and focused
- [ ] **Verify:** Modal shows "You've transcribed 5.0 minutes"
- [ ] **Verify:** Cannot dismiss modal (clicking outside/Esc doesn't close it)
- [ ] Click "Sign Up"
- [ ] Complete signup on web app
- [ ] Return to desktop app
- [ ] **Check console:** User should no longer be anonymous
- [ ] **Verify:** Can record again
- [ ] **Check recordings list:** All previous recordings still there
- [ ] **Check Supabase:** `total_usage_limit` row updated with email, `is_anonymous = false`

**Edge Cases:**
- [ ] What if user clicks "Sign In" instead of "Sign Up"? (Should also work - converts session)
- [ ] What if signup fails or user closes browser? (Still blocked from recording?)
- [ ] What if user has exactly 4.99 minutes then makes 0.02 min recording? (Should trigger after)
- [ ] Test with manual recording, VAD recording, and file upload - all should be blocked

---

### 5. Sign Out Flow (Permanent User)

**Expected Flow:**
```
Signed-in permanent user → Sign out → Session cleared →
Launch app again → Onboarding appears → New anonymous session created
```

**Test Steps:**
- [ ] Sign in as permanent user (not anonymous)
- [ ] Make a recording (verify it works)
- [ ] Sign out (click sign out button)
- [ ] **Verify:** Redirected to homepage or sign-in
- [ ] **Verify:** localStorage `sb-` keys cleared
- [ ] Relaunch app
- [ ] **Verify:** Onboarding appears (treated as new user)
- [ ] **Verify:** New anonymous session created
- [ ] **Check:** Previous recordings from permanent user are NOT visible (correct - new session)

**Edge Cases:**
- [ ] Sign out during active recording - what happens?
- [ ] Sign out during transcription - does it complete?

---

### 6. Multi-Device Scenario

**Expected Flow:**
```
Device 1: Anonymous user makes recordings →
Device 2: Launch app → New anonymous session (can't access Device 1 recordings) →
Sign up on Device 2 → Still can't access Device 1 recordings (expected)
```

**Test Steps:**
- [ ] Device 1: Complete onboarding as anonymous, make 3 recordings
- [ ] Device 2: Install app, complete onboarding as anonymous
- [ ] **Verify:** Device 2 does NOT show Device 1's recordings (expected)
- [ ] Device 2: Sign up
- [ ] **Verify:** Still doesn't show Device 1 recordings (correct - different user)
- [ ] Device 1: Sign up with SAME account
- [ ] **Verify:** Device 1 recordings preserved
- [ ] **Expected limitation:** Each device has separate anonymous sessions

---

### 7. Auth Callback from Web App

**Expected Flow:**
```
Anonymous user → Click "Sign Up" → Redirected to web app →
Complete signup → Callback to desktop app → Session updates →
User is now permanent
```

**Test Steps:**
- [ ] As anonymous user, trigger signup modal (hit 5 min gate)
- [ ] Click "Sign Up"
- [ ] Complete signup on noteflux.app
- [ ] **Verify:** Callback URL received: `noteflux://auth/callback?access_token=...&refresh_token=...`
- [ ] **Verify:** Desktop app receives tokens
- [ ] **Check console:** Session updated
- [ ] **Verify:** `auth.isAnonymous` is now `false`
- [ ] **Verify:** Can record again
- [ ] Check Supabase `auth.users` table - same `user_id`, but now has email

**Edge Cases:**
- [ ] What if callback tokens are invalid? (Error handling?)
- [ ] What if user closes desktop app before callback completes? (Test on relaunch)

---

### 8. Onboarding Skip/Cancel

**Expected Flow:**
```
User sees onboarding → Clicks "Skip" → Anonymous session already created →
Can still record
```

**Test Steps:**
- [ ] Launch as new user
- [ ] When onboarding appears, click "Skip" (if available)
- [ ] **Verify:** Anonymous session still created
- [ ] **Verify:** Can record immediately after skipping
- [ ] Make a recording
- [ ] Verify transcription and paste work

---

### 9. Usage Tracking Accuracy

**Test Steps:**
- [ ] As anonymous user, make recording of known duration (e.g., say "test" for ~1 second)
- [ ] Check console: "Usage tracked: X min"
- [ ] Check Supabase `total_usage_limit` table
- [ ] **Verify:** `total_minutes` matches actual transcribed duration
- [ ] Make another recording
- [ ] **Verify:** `total_minutes` increments correctly
- [ ] **Verify:** No duplicate rows for same user

**Edge Cases:**
- [ ] Recording very short audio (<1 second) - does it track?
- [ ] Recording fails mid-transcription - is partial usage tracked?
- [ ] Multiple simultaneous recordings (if possible) - race condition?

---

### 10. RLS Policy Verification

**Test in Supabase SQL Editor:**

```sql
-- As anonymous user (run in app console first: const user = await supabase.auth.getUser())
-- Then paste user_id below

-- Should SUCCEED (can view own data)
SELECT * FROM total_usage_limit WHERE user_id = 'PASTE-ANONYMOUS-USER-ID';

-- Should FAIL (cannot view other users)
SELECT * FROM total_usage_limit WHERE user_id != auth.uid();

-- Should SUCCEED (can update own data)
UPDATE total_usage_limit SET total_minutes = 1.0 WHERE user_id = auth.uid();

-- Should FAIL (cannot update others)
UPDATE total_usage_limit SET total_minutes = 1.0 WHERE user_id != auth.uid();
```

**Test Steps:**
- [ ] Run SELECT query - should return own row
- [ ] Run UPDATE query - should update successfully
- [ ] Verify cannot access other users' data

---

### 11. Transcription After Gate (Permanent User)

**Expected Flow:**
```
Convert from anonymous to permanent → Hit 5 min gate again →
Gate should NOT trigger (only for anonymous users)
```

**Test Steps:**
- [ ] Start as anonymous user
- [ ] Convert to permanent user
- [ ] Set usage to 10 minutes (above limit): `UPDATE total_usage_limit SET total_minutes = 10.0 WHERE user_id = auth.uid();`
- [ ] Try to record
- [ ] **Verify:** Recording works (gate only applies to anonymous users)
- [ ] **Verify:** No signup modal appears
- [ ] **Verify:** Permanent users have unlimited recording

**✅ FIXED:** Gate check now includes `&& auth.isAnonymous` to ensure only anonymous users are gated.

---

### 12. Recordings Persistence Across Sessions

**Test Steps:**
- [ ] As anonymous user, make 5 recordings
- [ ] Close app completely
- [ ] Relaunch app
- [ ] **Verify:** All 5 recordings still visible
- [ ] **Verify:** Same anonymous session persists (same user_id)
- [ ] Sign up
- [ ] Close and relaunch
- [ ] **Verify:** All recordings still there (now as permanent user)

---

## Known Limitations (Document These)

1. **Anonymous sessions are device-specific**
   - Users cannot access recordings from other devices
   - Must sign up to enable multi-device access

2. **Data loss if browser cache cleared**
   - Anonymous sessions stored in localStorage
   - Clearing app data loses session and recordings
   - Recommend signing up early to prevent loss

3. **5-minute limit is cumulative**
   - Tracked across all recordings
   - Not 5 minutes per day/session
   - One-time gate to encourage signup

4. **Anonymous users cannot:**
   - Access recordings from other devices
   - Recover account if session lost
   - Use cloud sync features (if any)

---

## Regression Tests (Ensure Nothing Broke)

### Core Recording
- [ ] Manual recording works (local button + global shortcut)
- [ ] VAD recording works (if used)
- [ ] File upload works
- [ ] Cancel recording works
- [ ] Recording indicator visible
- [ ] Audio quality unchanged

### Transcription
- [ ] Transcription starts after recording stops
- [ ] Groq/OpenAI/other providers work
- [ ] Transcription status updates correctly
- [ ] Error handling for failed transcriptions

### Paste/Delivery
- [ ] Paste into external apps works (global shortcut)
- [ ] Paste into onboarding textarea works
- [ ] Copy to clipboard works
- [ ] Delivery modes respect settings

### UI/UX
- [ ] Settings page loads correctly
- [ ] Recordings list displays all recordings
- [ ] Edit recording title/subtitle works
- [ ] Delete recording works
- [ ] Search/filter recordings works
- [ ] Theme switching works

### Settings Persistence
- [ ] Preferences saved correctly
- [ ] Shortcuts customization works
- [ ] Device selection persists
- [ ] Transcription provider selection persists

---

## Console Logs to Watch For

**Good Logs (Expected):**
- ✅ "Anonymous session created for onboarding"
- ✅ "Recording started"
- ✅ "Recording stopped"
- ✅ "Usage tracked: X min, $Y (Provider)"
- ✅ "typeAtCursor succeeded"

**Bad Logs (Investigate):**
- ❌ "Failed to create anonymous session: ..."
- ❌ "Authentication Required" (during onboarding)
- ❌ 403/401 errors on total_usage_limit (RLS issues)
- ❌ Session creation errors
- ❌ "Cannot read property 'isAnonymous' of null"

---

## Before Release Checklist

- [ ] All tests above pass
- [ ] No console errors during happy path
- [ ] RLS policies verified in production Supabase
- [ ] Anonymous auth enabled in Supabase dashboard
- [ ] Manual linking enabled in Supabase dashboard
- [ ] Captcha configured (optional but recommended)
- [ ] Documentation updated with anonymous flow
- [ ] User-facing messaging clear ("Sign up to continue")
- [ ] Error messages are helpful, not technical
- [ ] Graceful degradation if Supabase is down

---

## Quick Smoke Test (5 Minutes)

If short on time, test this minimal flow:

1. **Fresh install** → Onboarding → Record during onboarding → Paste works ✓
2. **Complete onboarding** → Record → Transcribe → Paste ✓
3. **Set usage to 5 min** → Try record → Signup modal appears ✓
4. **Sign up** → Record again → Works ✓

If all 4 steps pass, core flow is working.
