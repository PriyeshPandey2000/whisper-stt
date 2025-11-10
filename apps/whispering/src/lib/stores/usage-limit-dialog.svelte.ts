export const usageLimitDialog = (() => {
	let isOpen = $state(false);
	let totalMinutes = $state(0);
	let limitMinutes = $state(2000);

	return {
		get isOpen() {
			return isOpen;
		},
		set isOpen(value: boolean) {
			isOpen = value;
		},
		get totalMinutes() {
			return totalMinutes;
		},
		get limitMinutes() {
			return limitMinutes;
		},
		open: (info: { totalMinutes: number; limitMinutes: number }) => {
			totalMinutes = info.totalMinutes;
			limitMinutes = info.limitMinutes;
			isOpen = true;
		},
		close: () => {
			isOpen = false;
		}
	};
})();