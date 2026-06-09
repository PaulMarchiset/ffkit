import { cn } from "@/lib/cn";
import type { JobViewStatus } from "@/lib/types";

interface Props {
  status: JobViewStatus;
  /** The animated phase word shown while running (e.g. "Encoding"). */
  displayedWord: string;
}

const TERMINAL_TEXT: Record<Exclude<JobViewStatus, "running">, string> = {
  success: "Done.",
  cancelled: "Cancelled.",
  failed: "Failed.",
};

/** The large serif headline for the job view: the animated phase word while
 *  running (accent green), or a terminal verdict in the matching tone. */
export function JobStatusWord({ status, displayedWord }: Props) {
  const text = status === "running" ? `${displayedWord}…` : TERMINAL_TEXT[status];
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
