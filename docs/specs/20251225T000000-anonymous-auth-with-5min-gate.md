# Anonymous Auth with 5-Minute Recording Gate

**Created:** 2025-12-25
**Status:** Implemented

## Problem
New users face friction when forced to sign up before trying the app. We want to let them start recording immediately, then require signup after 5 minutes of total transcribed audio.

## Solution
1. After onboarding, automatically create anonymous Supabase session
2. Track cumulative transcription duration per user
3. When 5 minutes reached, block new recordings and require signup
4. Convert anonymous user to permanent account on signup

## Implementation Plan

### Step 1: Add Anonymous Auth Support
- [ ] Update `auth-service.ts` to add `signInAnonymously()` method
- [ ] Update auth store to expose `isAnonymous` state
- [ ] Add `convertAnonymousUser()` method for email/password conversion

### Step 2: Auto-Create Anonymous Session After Onboarding
- [ ] Find onboarding completion flow
- [ ] Call `signInAnonymously()` automatically
- [ ] Redirect to main app (skip signup page)

### Step 3: Track Total Transcription Duration
- [ ] Add helper to calculate total transcription duration from all recordings
- [ ] Store duration in recording metadata (already have timestamps)
- [ ] Create utility to sum up all durations for current user

### Step 4: Implement 5-Minute Gate
- [ ] In main recording page, check if user is anonymous AND has >= 5 minutes
- [ ] Block recording start if gate reached
- [ ] Show signup modal with message: "Please sign up to continue recording"
- [ ] No "maybe later" option - must sign up to continue

### Step 5: Signup Modal & Conversion
- [ ] Create signup modal component (or reuse existing)
- [ ] On successful signup, convert anonymous → permanent
- [ ] Ensure all recordings persist (user_id stays same)
- [ ] After conversion, allow recording to continue

## Technical Details

### Anonymous Session Creation
```typescript
// In auth-service.ts
async signInAnonymously() {
  const { data, error } = await this.supabase.auth.signInAnonymously()
  // handle session
}
```

### Duration Tracking
```typescript
// Sum all recording durations
const totalMinutes = recordings.reduce((sum, r) => {
  const duration = (new Date(r.updatedAt) - new Date(r.createdAt)) / 60000
  return sum + duration
}, 0)
```

### Gate Check
```typescript
// In +page.svelte
$: isGateReached = auth.isAnonymous && totalTranscriptionMinutes >= 5
$: canStartRecording = !isGateReached
```

### Anonymous → Permanent Conversion
```typescript
// Convert by adding email/password
await supabase.auth.updateUser({
  email: userEmail,
  password: userPassword
})
```

## Files to Modify
1. `/lib/services/auth/auth-service.ts` - Add anonymous methods
2. `/lib/stores/auth.svelte.ts` - Expose isAnonymous
3. `/routes/onboarding/...` - Auto-create anonymous session
4. `/routes/+page.svelte` - Implement gate logic and modal
5. `/lib/components/auth/...` - Signup modal component

## Edge Cases
- User clears browser data → loses anonymous session
- User switches devices → can't access recordings (expected)
- User tries to export before 5 min → allowed (just recording blocked after)
- Session expiration → handle gracefully

## Review

### Implementation Summary

Successfully implemented anonymous authentication with a 5-minute transcription gate. Here's what was done:

#### 1. Anonymous Auth Infrastructure
- Added `signInAnonymously()` method to `auth-service.ts` (line 129-144)
- Updated `AuthUser` type to include `isAnonymous` boolean field (line 8)
- Modified `mapUser()` to extract `is_anonymous` from Supabase user object (line 85)
- Added `isAnonymous()` getter method to auth service (line 125-127)
- Exposed `isAnonymous` state and `signInAnonymously()` in auth store (lines 32-46)

#### 2. Onboarding Integration
- Modified `OnboardingFlow.svelte` to create anonymous session at START of onboarding (not end)
- Added auth store import and async call to `signInAnonymously()` in `onMount()` function before showing onboarding (lines 157-166)
- Removed duplicate session creation from `completeOnboarding()` function
- Users can now test all features (recording, transcription, paste) during onboarding
- No special auth bypasses needed - clean implementation

#### 3. Usage Tracking
- Created `anonymous-gate.ts` service to check if anonymous users have reached the 5-minute limit
- Leverages existing `total_usage_limit` Supabase table that already tracks transcription minutes
- Returns `{ needsSignup: boolean, totalMinutes: number }` for anonymous users

#### 4. Gate Logic Implementation
- Added gate checks to all recording entry points in `commands.ts`:
  - `startManualRecording` (lines 102-110)
  - `startVadRecording` (lines 268-276)
  - `uploadRecordings` (lines 537-543)
- Each check verifies both:
  1. User has >= 5 minutes (`gateStatus?.needsSignup`)
  2. User is anonymous (`auth.isAnonymous`)
- Only anonymous users are gated - permanent users have unlimited recording
- Opens signup dialog and blocks recording with descriptive error message
- Shows exact minutes transcribed to user

#### 5. Signup Required Dialog
- Created `signup-required-dialog.svelte.ts` store to manage dialog state
- Built `SignupRequiredDialog.svelte` component with:
  - Non-dismissible modal (prevents clicking outside or pressing Esc)
  - Clear value proposition for signing up
  - Both "Sign Up" and "Sign In" options
  - Benefits list: unlimited transcriptions, multi-device access, cloud backup, pay-only-API-costs
- Integrated dialog into main `+page.svelte` (line 440)

### Files Modified
1. `/lib/services/auth/auth-service.ts` - Anonymous auth methods
2. `/lib/stores/auth.svelte.ts` - Exposed isAnonymous state
3. `/lib/components/onboarding/OnboardingFlow.svelte` - Auto-create anonymous session
4. `/lib/query/commands.ts` - Gate checks in all recording functions
5. `/routes/+page.svelte` - Added SignupRequiredDialog component

### Files Created
1. `/lib/services/anonymous-gate.ts` - Utility to check 5-minute limit
2. `/lib/stores/signup-required-dialog.svelte.ts` - Dialog state management
3. `/lib/components/auth/SignupRequiredDialog.svelte` - Signup modal UI

### How It Works

**Improved Flow (Final Implementation):**
1. User launches app → onboarding needs to be shown
2. **IMMEDIATELY** create anonymous session (before showing onboarding)
3. Show onboarding → user can test recording, transcription, paste (all work with session)
4. User completes onboarding → marked as complete
5. User records audio → transcription minutes tracked in Supabase `total_usage_limit` table
6. User attempts to start new recording after 5 minutes → gate check runs
7. If limit reached → signup modal appears, recording blocked
8. User signs up → anonymous account converts to permanent (via `updateUser()`)
9. All previous recordings persist (same `user_id`)
10. User can continue recording without limits

**Key Improvement:** Anonymous session created at START of onboarding, not end. This eliminates all friction - users can test features during onboarding without special bypasses or hacks.

### Conversion Mechanism
When user signs up through the external web app (noteflux.app), Supabase automatically converts the anonymous user to a permanent user by linking the new email/password identity. The `user_id` remains the same, ensuring all recordings and usage data persist seamlessly.

### Next Steps for Testing
- Enable anonymous sign-ins in Supabase dashboard
- Enable manual linking in Supabase auth settings
- Test onboarding flow creates anonymous session
- Test gate triggers at 5 minutes
- Test signup conversion preserves recordings
- Verify usage tracking continues after conversion
