import { useEffect, useRef } from "react";

type Unlisten = () => void;

/**
 * Subscribes to a Tauri event for the lifetime of the calling component and
 * tears the subscription down on unmount.
 *
 * `subscribe` is any function that registers a listener and resolves to an
 * unlisten fn — e.g. `(cb) => jobsService.onProgress(cb)`. Keeping it as a
 * function (rather than an event-name string) preserves the IPC seam: call
 * sites still go through the services layer / tauri.ts wrappers.
 *
 * Encapsulates the two-layer race defense the `listen()` lifecycle requires
 * (the listener registers synchronously, but the unlisten fn only arrives via
 * Promise — see jobsContext): (1) a `cancelled` flag blocks the handler if a
 * late event fires between unmount and the unlisten resolving, and (2) any
 * unlisten that resolves after cleanup has run is invoked immediately so a
 * registration can never outlive the effect.
 *
 * Both `subscribe` and `handler` are read through refs, so the subscription is
 * established exactly once on mount — passing fresh inline functions each
 * render does NOT re-subscribe, and the handler always sees current closures.
 */
export function useTauriListener<T>(
  subscribe: (cb: (payload: T) => void) => Promise<Unlisten>,
  handler: (payload: T) => void,
): void {
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let cancelled = false;
    let unlisten: Unlisten | null = null;

    subscribeRef
      .current((payload) => {
        if (cancelled) return;
        handlerRef.current(payload);
      })
      .then((u) => {
        if (cancelled) u();
        else unlisten = u;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
