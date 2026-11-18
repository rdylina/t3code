import { useSyncExternalStore } from "react";

import { observeResize } from "../lib/observeResize";

/** Whether `element` is at least `minWidth` pixels wide; false until it mounts. */
export function useElementMinWidth(element: HTMLElement | null, minWidth: number): boolean {
  const subscribe = (callback: () => void) =>
    element ? observeResize(element, callback) : () => {};
  const getSnapshot = () => {
    if (!element) return false;
    const style = getComputedStyle(element);
    return (
      element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) >=
      minWidth
    );
  };
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
