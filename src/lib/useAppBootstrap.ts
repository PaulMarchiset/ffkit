import { useEffect, useState } from "react";
import { jobsService } from "@/lib/services/jobsService";
import type { EncoderList } from "@/lib/types";

export interface AppBootstrap {
  encoders: EncoderList | null;
  encoderLoading: boolean;
}

/**
 * Loads the one-shot encoder detection result the app shell needs on startup.
 * Probing can take a few seconds, so its loading state is exposed separately.
 * Settings live in their own SettingsContext (see {@link useSettings}).
 */
export function useAppBootstrap(): AppBootstrap {
  const [encoders, setEncoders] = useState<EncoderList | null>(null);
  const [encoderLoading, setEncoderLoading] = useState(true);

  useEffect(() => {
    jobsService.detectEncoders()
      .then(setEncoders)
      .finally(() => setEncoderLoading(false));
  }, []);

  return { encoders, encoderLoading };
}
