import { useEffect, useRef, useState } from "react";
import { filesService } from "@/lib/services/filesService";

export interface WaveformState {
  /** Normalized peaks (0..1), or null until loaded / on failure. */
  peaks: number[] | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache: decoding audio peaks is relatively expensive, and the
// same file is commonly re-opened while switching features, so we keep results
// keyed by `path|buckets` for the lifetime of the session.
const cache = new Map<string, number[]>();

/**
 * Loads normalized audio peaks for `path` when `enabled`. Returns flat state
 * (no peaks) for files without an audio track — callers should render a
 * baseline in that case.
 */
export function useWaveform(
  path: string | null,
  buckets: number,
  enabled: boolean,
): WaveformState {
  const [state, setState] = useState<WaveformState>({
    peaks: null,
    loading: false,
    error: null,
  });
  // Guards against a stale async response overwriting a newer request.
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !path) {
      setState({ peaks: null, loading: false, error: null });
      return;
    }

    const key = `${path}|${buckets}`;
    const cached = cache.get(key);
    if (cached) {
      setState({ peaks: cached, loading: false, error: null });
      return;
    }

    const reqId = ++reqIdRef.current;
    setState({ peaks: null, loading: true, error: null });

    filesService
      .waveform(path, buckets)
      .then((peaks) => {
        cache.set(key, peaks);
        if (reqIdRef.current === reqId) {
          setState({ peaks, loading: false, error: null });
        }
      })
      .catch((e) => {
        if (reqIdRef.current === reqId) {
          setState({ peaks: null, loading: false, error: String(e) });
        }
      });
  }, [path, buckets, enabled]);

  return state;
}
