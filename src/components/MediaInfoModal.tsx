import { useTranslation } from "react-i18next";
import { Modal } from "./ui/Modal";
import { formatBitrate, formatBytes, formatDuration } from "@/lib/format";
import type { FileInfo } from "@/lib/types";

interface Props {
  file: FileInfo;
  onClose: () => void;
}

type Field = { label: string; value: string };

function formatFps(fps: number): string {
  return Number.isInteger(fps) ? `${fps} fps` : `${fps.toFixed(2)} fps`;
}

function formatChannels(channels: number): string {
  if (channels === 1) return "1 (mono)";
  if (channels === 2) return "2 (stereo)";
  if (channels === 6) return "6 (5.1)";
  if (channels === 8) return "8 (7.1)";
  return String(channels);
}

function Group({ title, fields }: { title: string; fields: Field[] }) {
  if (fields.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <dl className="rounded-xl bg-surface px-4 py-1">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-center justify-between gap-4 border-b border-border-soft py-2.5 last:border-0"
          >
            <dt className="flex-shrink-0 text-sm text-muted">{f.label}</dt>
            <dd className="min-w-0 truncate text-right text-sm text-fg">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Read-only breakdown of a probed file's container / video / audio streams. */
export function MediaInfoModal({ file, onClose }: Props) {
  const { t } = useTranslation();

  // Build each group, dropping fields ffprobe didn't report.
  const push = (fields: Field[], label: string, value: string | undefined | null) => {
    if (value != null && value !== "") fields.push({ label, value });
  };

  const general: Field[] = [];
  push(general, t("mediaInfo.name"), file.name);
  push(general, t("mediaInfo.container"), file.container?.toUpperCase());
  push(general, t("mediaInfo.size"), formatBytes(file.size));
  push(general, t("mediaInfo.duration"), file.duration != null ? formatDuration(file.duration) : null);
  push(general, t("mediaInfo.bitrate"), file.bitrate ? formatBitrate(file.bitrate) : null);

  const video: Field[] = [];
  push(video, t("mediaInfo.codec"), file.videoCodec?.toUpperCase());
  push(video, t("mediaInfo.profile"), file.videoProfile);
  push(video, t("mediaInfo.resolution"), file.width && file.height ? `${file.width}×${file.height}` : null);
  push(video, t("mediaInfo.fps"), file.fps ? formatFps(file.fps) : null);
  push(video, t("mediaInfo.pixFmt"), file.pixFmt);
  push(video, t("mediaInfo.bitrate"), file.videoBitrate ? formatBitrate(file.videoBitrate) : null);

  const audio: Field[] = [];
  push(audio, t("mediaInfo.codec"), file.audioCodec?.toUpperCase());
  push(audio, t("mediaInfo.channels"), file.audioChannels ? formatChannels(file.audioChannels) : null);
  push(audio, t("mediaInfo.sampleRate"), file.audioSampleRate ? `${(file.audioSampleRate / 1000).toFixed(file.audioSampleRate % 1000 === 0 ? 0 : 1)} kHz` : null);
  push(audio, t("mediaInfo.bitrate"), file.audioBitrate ? formatBitrate(file.audioBitrate) : null);

  return (
    <Modal title={t("mediaInfo.title")} onClose={onClose}>
      <div className="space-y-5">
        <Group title={t("mediaInfo.general")} fields={general} />
        <Group title={t("mediaInfo.video")} fields={video} />
        <Group title={t("mediaInfo.audio")} fields={audio} />
      </div>
    </Modal>
  );
}
