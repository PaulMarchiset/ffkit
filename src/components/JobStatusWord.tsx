import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { JobViewStatus } from "@/lib/types";

interface Props {
  status: JobViewStatus;
  /** The animated phase word shown while running (e.g. "Encoding"). */
  displayedWord: string;
}

const TERMINAL_KEY: Record<Exclude<JobViewStatus, "running">, string> = {
  success: "job.done",
  cancelled: "job.cancelled",
  failed: "job.failed",
};

/** The large serif headline for the job view: the animated phase word while
 *  running (accent green), or a terminal verdict in the matching tone. */
export function JobStatusWord({ status, displayedWord }: Props) {
  const { t } = useTranslation();
  const text = status === "running" ? `${displayedWord}…` : t(TERMINAL_KEY[status]);
  return (
    <h1
      className={cn(
        "font-serif text-5xl leading-tight tracking-tight text-center",
        status === "running" && "text-accent",
        status === "success" && "text-fg",
        (status === "cancelled" || status === "failed") && "text-red-500",
      )}
    >
      {text}
    </h1>
  );
}
