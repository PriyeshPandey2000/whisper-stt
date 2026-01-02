/**
 * Store for managing the signup required dialog state
 * Shown when anonymous users reach the 5-minute transcription limit
 */

let isOpen = $state(false);

export const signupRequiredDialog = {
  get isOpen() {
    return isOpen;
  },

  open() {
    isOpen = true;
  },

  close() {
    isOpen = false;
  },
};
