import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  onReplace: () => void;
  onCancel: () => void;
}

export function ConfirmOverwritePanel({ visible, onReplace, onCancel }: Props) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-300">
      <p className="font-medium mb-2">{t("confirm.title")}</p>
      <div className="flex gap-2">
        <button
          onClick={onReplace}
          className="px-3 py-1 rounded-[10px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
        >
          {t("confirm.replace")}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-[10px] border border-border text-muted text-xs font-medium hover:text-fg hover:border-border-hover transition-colors"
        >
          {t("confirm.keepMine")}
        </button>
      </div>
    </div>
  );
}
