/**
 * Store for managing the auth required dialog state
 * Dialog is always non-dismissible - if auth is required, user must authenticate
 */

let isOpen = $state(false);

export const authRequiredDialog = {
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

