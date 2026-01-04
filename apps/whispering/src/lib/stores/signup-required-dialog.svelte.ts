/**
 * Store for managing the signup required dialog state
 * Shown when anonymous users reach the 5-minute transcription limit
 */

let isOpen = $state(false);
let wasOnboardingOpen = $state(false);

export const signupRequiredDialog = {
  get isOpen() {
    return isOpen;
  },

  get wasOnboardingOpen() {
    return wasOnboardingOpen;
  },

  open(onboardingWasOpen: boolean = false) {
    isOpen = true;
    wasOnboardingOpen = onboardingWasOpen;
  },

  close() {
    isOpen = false;
    wasOnboardingOpen = false;
  },
};
