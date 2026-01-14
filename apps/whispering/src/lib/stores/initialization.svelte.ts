type InitializationStore = {
	isComplete: boolean;
	complete: () => void;
};

function createInitializationStore(): InitializationStore {
	let isComplete = $state(false);

	return {
		get isComplete() {
			return isComplete;
		},
		complete() {
			isComplete = true;
		}
	};
}

export const initializationStore = createInitializationStore();
