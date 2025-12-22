# Permission Handling Improvements for Onboarding Flow

**Created**: 2025-12-21
**Status**: Planning

## Problem Statement

The current onboarding permissions screen lacks proper feedback and handling for various failure scenarios. Users can get stuck if they deny permissions, with no clear path forward or guidance on how to resolve issues.

## Current Issues

### 1. **No Escape Hatch**
- If user denies permissions, they're stuck in the onboarding flow
- No "Skip for now" option visible to users
- `onSkip` function exists but no button triggers it

### 2. **Silent Failures**
- Denied permissions only show a toast (which disappears)
- After toast disappears, user sees the same button with no indication of what went wrong
- No persistent error message

### 3. **System-Level Denials Not Handled**
- If user previously denied permission at system level, clicking "Allow" button does nothing
- Browser won't show permission prompt again
- No guidance to go to system settings manually

### 4. **Accessibility Permission Confusion**
- Opens System Settings but provides no guidance
- If user closes settings without enabling, they're back to the same screen
- No instructions on WHERE to enable it in System Settings

### 5. **No Retry Strategy**
- After denial, the same button appears with same text
- User doesn't know if they should retry or fix something first

## Edge Cases to Handle

1. **Microphone permission denied in browser/system**
   - Browser blocks future prompts
   - User must manually enable in system settings

2. **Accessibility permission denied/skipped**
   - User closes System Settings without enabling
   - User needs manual instructions

3. **Permission granted then revoked**
   - User could revoke in system settings while app is running
   - Polling should detect this

4. **Browser blocks permission API**
   - Some contexts don't allow permission queries
   - Need fallback behavior

5. **User wants to skip setup**
   - Valid use case: set up later
   - Should be allowed but with clear warning

6. **Partial permissions**
   - Microphone granted but accessibility denied
   - Should clearly show what will/won't work

7. **Multiple denials**
   - User clicks "Allow" multiple times, denies each time
   - Need to detect this pattern and show different UI

## Proposed Solutions

### Solution 1: Add Permission States

Expand the permission status to include more granular states:

```typescript
type PermissionStatus =
  | 'unknown'        // Initial state, checking
  | 'pending'        // Not requested yet, can request
  | 'requesting'     // Currently waiting for user response
  | 'granted'        // User granted permission
  | 'denied'         // User denied permission (browser prompt)
  | 'blocked'        // System-level denial, needs manual fix
```

### Solution 2: Different UI for Each State

#### For "pending" state:
- Show "Allow Microphone" button
- Include help text explaining why it's needed

#### For "requesting" state:
- Show loading spinner
- "Waiting for permission..." text

#### For "denied" state (first denial):
- Change button to "Try Again"
- Show warning message: "Permission denied. Please allow when prompted."
- Add small "Skip for now" link

#### For "blocked" state (system-level denial):
- Remove the request button
- Show persistent error message in the card itself
- Provide step-by-step manual instructions
- Show "Open System Settings" button
- Always show "Skip for now" option

### Solution 3: Add "Skip for Now" Option

Add a text button at the bottom of the permissions screen:

```svelte
<div class="text-center">
  <button
    onclick={onSkip}
    class="text-xs text-white/40 hover:text-white/60 underline"
  >
    Skip for now (you can enable these later in Settings)
  </button>
</div>
```

Benefits:
- Users never feel trapped
- Can explore app first, enable permissions later
- Reduces onboarding friction

### Solution 4: Persistent Error Messages

Instead of just toasts, show error states inline:

```svelte
{#if microphoneStatus === 'denied'}
  <div class="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
    <p class="text-xs text-red-400">
      Permission denied. Please allow microphone access when prompted.
    </p>
  </div>
{:else if microphoneStatus === 'blocked'}
  <div class="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg space-y-2">
    <p class="text-xs text-orange-400 font-medium">
      Microphone blocked at system level
    </p>
    <p class="text-xs text-white/50">
      Open System Settings → Privacy & Security → Microphone → Enable for NoteFlux
    </p>
    <Button size="sm" variant="outline" onclick={openSystemSettings}>
      Open System Settings
    </Button>
  </div>
{/if}
```

### Solution 5: Smart Retry Detection

Track how many times user has denied each permission:

```typescript
let microphoneDenialCount = 0;
let accessibilityDenialCount = 0;

// After denial:
microphoneDenialCount++;

// If denied twice, assume it's blocked at system level
if (microphoneDenialCount >= 2) {
  microphoneStatus = 'blocked';
}
```

### Solution 6: Better Accessibility Instructions

For accessibility permission:
- Show preview of System Settings path with icons
- Add "Need help?" expandable section with screenshots
- Provide direct link to Apple support docs
- Add note that they may need to restart app after enabling

### Solution 7: Settings Page Integration

Add a "Permissions" section in app settings where users can:
- See current permission status
- Get same inline help and buttons to enable
- This way skipping in onboarding isn't a dead end

## Recommended Approach

Implement in this order:

### Phase 1: Non-Blocking (Essential - Do First)
- [ ] Add "Skip for now" button to permissions screen
- [ ] Update `OnboardingFlow.svelte` to allow skipping permission step
- [ ] Test that users can complete onboarding without permissions

### Phase 2: Better State Management (Core Improvements)
- [ ] Expand `PermissionStatus` type to include 'blocked' state
- [ ] Add denial count tracking for each permission
- [ ] Implement logic to move from 'denied' → 'blocked' after 2 denials
- [ ] Update UI to show different states clearly

### Phase 3: Inline Error Messages (UX Polish)
- [ ] Remove reliance on toasts for permission errors
- [ ] Add persistent error messages in permission cards
- [ ] Show different messages for 'denied' vs 'blocked' states
- [ ] Add manual instruction text for 'blocked' state

### Phase 4: Helper Functions (Nice to Have)
- [ ] Add "Open System Settings" button for blocked states
- [ ] Add "Need help?" expandable section with detailed instructions
- [ ] Consider adding screenshots or video guides

### Phase 5: Settings Integration (Future)
- [ ] Create permissions section in app settings page
- [ ] Mirror same permission checking/requesting UI
- [ ] Add deep link from onboarding skip message to settings

## Success Criteria

After implementation, users should be able to:
1. ✅ Always proceed past permissions screen (via skip)
2. ✅ Understand exactly what went wrong when permission is denied
3. ✅ Know how to fix system-level permission blocks
4. ✅ Get help without leaving the app
5. ✅ Enable permissions later from settings page

## Open Questions

1. Should we require microphone permission or allow full skip?
   - Recommendation: Allow skip but show warning about limited functionality

2. Should we auto-open System Settings for blocked permissions?
   - Recommendation: Provide button but don't auto-open (less intrusive)

3. How many denials before we consider it "blocked"?
   - Recommendation: 2 denials (gives user one retry, then assumes system block)

4. Should we block onboarding completion if permissions denied?
   - Recommendation: No, always allow skip with clear warnings

## Notes

- Keep the polling interval (2s) as it helps detect manual permission changes
- Maintain the auto-advance on success (good UX when things work)
- Don't remove toasts entirely, use them as supplementary feedback
- Consider analytics to track how many users skip vs complete permissions
