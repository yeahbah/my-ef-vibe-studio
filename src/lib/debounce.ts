import { useEffect, type DependencyList } from "react";

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let handle: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (handle) {
      clearTimeout(handle);
    }

    handle = setTimeout(() => {
      handle = undefined;
      fn(...args);
    }, delayMs);
  };
}

export function useDebouncedEffect(
  effect: () => void,
  deps: DependencyList,
  delayMs: number,
): void {
  useEffect(() => {
    const handle = window.setTimeout(() => {
      effect();
    }, delayMs);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce the provided dependency snapshot
  }, [...deps, delayMs]);
}
