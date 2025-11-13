export const authRequiredDialog = (() => {
	let isOpen = $state(false);

	return {
		get isOpen() {
			return isOpen;
		},
		set isOpen(value: boolean) {
			isOpen = value;
		},
		open: () => {
			isOpen = true;
		},
		close: () => {
			isOpen = false;
		}
	};
})();

