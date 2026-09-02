import { autoUpdate, computePosition } from '@floating-ui/dom';
import type { Attachment } from 'svelte/attachments';
import type { FloatingConfig } from './types.js';

/**
 * Floating-ui positioning as a pair of Svelte attachments. The reference
 * attachment goes on the anchor (the control), the content attachment on the
 * floating list; `update()` recomputes from the live config the getter returns.
 *
 * `autoUpdate` (scroll/resize/ancestor tracking) is armed while both elements
 * are mounted and the config allows it, and torn down with the content element —
 * synchronously, so a list that mounts and unmounts within one tick never leaks
 * a listener set.
 */
export function createFloating(getConfig: () => FloatingConfig) {
    let reference: HTMLElement | undefined;
    let floating: HTMLElement | undefined;
    let stopAutoUpdate: (() => void) | undefined;

    function disarm() {
        stopAutoUpdate?.();
        stopAutoUpdate = undefined;
    }

    // Position only — this is also autoUpdate's callback, so it must never arm
    function position() {
        if (!reference || !floating) return;
        const { autoUpdate: _shouldAutoUpdate, ...config } = getConfig();
        const target = floating;

        void computePosition(reference, target, config).then((computed) => {
            // The list may have closed while the position was computing
            if (target !== floating) return;
            Object.assign(target.style, {
                position: computed.strategy,
                left: `${computed.x}px`,
                top: `${computed.y}px`,
            });
        });
    }

    // Arm or disarm autoUpdate per the live config. floating-ui runs the
    // callback synchronously while arming, which is why arming lives apart
    // from position().
    function arm() {
        if (!reference || !floating) return;
        if (getConfig().autoUpdate === false) disarm();
        else if (!stopAutoUpdate) stopAutoUpdate = autoUpdate(reference, floating, position);
    }

    function update() {
        position();
        arm();
    }

    const referenceAttachment: Attachment<HTMLElement> = (node) => {
        reference = node;
        update();
        return () => {
            if (reference === node) reference = undefined;
        };
    };

    const contentAttachment: Attachment<HTMLElement> = (node) => {
        floating = node;
        update();
        return () => {
            disarm();
            if (floating === node) floating = undefined;
        };
    };

    return { reference: referenceAttachment, content: contentAttachment, update };
}
