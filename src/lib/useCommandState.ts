import { useState } from "react";

export interface CommandState {
  /** Current text in the editor. */
  command: string;
  /** True if the editor differs from the last applied preset/template. */
  isDirty: boolean;
  /** True while a preset is queued behind an overwrite confirmation. */
  isPendingOverwrite: boolean;
  /** User typed in the editor. */
  onCommandChange(cmd: string): void;
  /** Discard edits and re-apply the last preset/template command. */
  resetToPreset(): void;
  /**
   * Apply a new command. If the editor is dirty, queues it behind a
   * confirmation dialog; otherwise applies immediately.
   */
  requestApply(cmd: string): void;
  /** Resolve the pending-overwrite dialog: keep the queued command. */
  confirmReplace(): void;
  /** Resolve the pending-overwrite dialog: discard the queued command. */
  cancelReplace(): void;
}

export function useCommandState(initial: string): CommandState {
  const [command, setCommand] = useState(initial);
  const [lastPresetCommand, setLastPresetCommand] = useState(initial);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  const isDirty = command !== lastPresetCommand;

  function apply(cmd: string) {
    setCommand(cmd);
    setLastPresetCommand(cmd);
    setPendingCommand(null);
  }

  return {
    command,
    isDirty,
    isPendingOverwrite: pendingCommand !== null,
    onCommandChange: setCommand,
    resetToPreset() {
      setCommand(lastPresetCommand);
    },
    requestApply(cmd) {
      if (command !== lastPresetCommand) {
        setPendingCommand(cmd);
      } else {
        apply(cmd);
      }
    },
    confirmReplace() {
      if (pendingCommand !== null) apply(pendingCommand);
    },
    cancelReplace() {
      setPendingCommand(null);
    },
  };
}
