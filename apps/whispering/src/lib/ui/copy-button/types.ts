/*
	Installed from @ieedan/shadcn-svelte-extras
*/

import type { ButtonPropsWithoutHTML } from "$lib/ui/button";
import type { UseClipboard } from "$lib/ui/hooks/use-clipboard.svelte";
import type { WithChildren, WithoutChildren } from "bits-ui";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export type CopyButtonProps = CopyButtonPropsWithoutHTML &
	WithoutChildren<HTMLAttributes<HTMLButtonElement>>;

export type CopyButtonPropsWithoutHTML = WithChildren<
	Pick<ButtonPropsWithoutHTML, "size" | "variant"> & {
		animationDuration?: number;
		icon?: Snippet<[]>;
		onCopy?: (status: UseClipboard["status"]) => void;
		ref?: HTMLButtonElement | null;
		text: string;
	}
>;
