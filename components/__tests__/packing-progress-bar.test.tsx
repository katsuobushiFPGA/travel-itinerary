import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackingProgressBar } from "@/components/packing-progress-bar";
import { packingProgress } from "@/lib/packing-progress";

describe("PackingProgressBar", () => {
  it("total=0 のときは何もレンダリングしない", () => {
    const { container } = render(
      <PackingProgressBar progress={packingProgress(0, 0)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("aria-valuenow が percent と一致する", () => {
    render(<PackingProgressBar progress={packingProgress(3, 12)} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("100% 完了時に緑クラスが付く", () => {
    const { container } = render(
      <PackingProgressBar progress={packingProgress(8, 8)} />,
    );
    // インナーバー要素を取得
    const inner = container.querySelector(
      "[role='progressbar'] > div",
    ) as HTMLElement;
    expect(inner.className).toMatch(/bg-emerald-500/);
  });

  it("checked < total なら percent が 100 でも緑にならない", () => {
    // packingProgress(199, 200) → percent=100 だが checked!=total
    const { container } = render(
      <PackingProgressBar progress={packingProgress(199, 200)} />,
    );
    const inner = container.querySelector(
      "[role='progressbar'] > div",
    ) as HTMLElement;
    expect(inner.className).not.toMatch(/bg-emerald-500/);
  });

  it("showLabel=false のときラベルを描画しない", () => {
    render(
      <PackingProgressBar
        progress={packingProgress(3, 12)}
        showLabel={false}
      />,
    );
    expect(screen.queryByText(/完了/)).toBeNull();
  });
});
