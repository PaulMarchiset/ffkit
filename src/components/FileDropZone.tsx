import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { UploadIcon } from "./icons/UploadIcon";

interface Props {
  onClick: () => void;
  dragging: boolean;
  loading: boolean;
  error: string | null;
}

export function FileDropZone({ onClick, dragging, loading, error }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl bg-surface flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
        dragging ? "border-accent/50 bg-accent/5" : "hover:border-border",
        loading && "opacity-60 pointer-events-none",
      )}
      style={{ minHeight: "160px" }}
      onClick={onClick}
    >
      <UploadIcon />

      {loading ? (
        <p className="text-muted text-sm">{t("dropzone.reading")}</p>
      ) : (
        <p className={cn("text-sm transition-colors", dragging ? "text-fg" : "text-muted")}>
          {dragging ? t("dropzone.active") : t("dropzone.idle")}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-1 px-6 text-center">{error}</p>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center hover:bg-accent/85 transition-colors"
        title="Browse files"
      >
        <Zap className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
