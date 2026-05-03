import {
  formatPackingProgress,
  type PackingProgress,
} from "@/lib/packing-progress";
import { cn } from "@/lib/utils";

export function PackingProgressBar({
  progress,
  showLabel = true,
}: {
  progress: PackingProgress;
  showLabel?: boolean;
}) {
  if (progress.total === 0) return null;

  // checked === total を完了基準にする。percent 起因（199/200 が四捨五入で 100% に
  // 見えるケース）で「完了」を誤表示しないため、percent ではなく整数比較にする。
  const completed = progress.checked === progress.total;

  return (
    <div className="space-y-0.5">
      {showLabel && (
        <p
          className={cn(
            "text-xs",
            completed && "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {formatPackingProgress(progress)}
        </p>
      )}
      <div
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`持ち物 ${progress.checked} / ${progress.total} 完了`}
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
      >
        <div
          className={cn(
            "h-full transition-[width]",
            completed ? "bg-emerald-500" : "bg-foreground/70",
          )}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
