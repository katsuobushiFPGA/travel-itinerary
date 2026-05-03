import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    trip: {
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

import { pauseShare, resumeShare } from "@/lib/actions/trip";
import { revalidatePath } from "next/cache";

describe("pauseShare / resumeShare", () => {
  beforeEach(() => {
    updateMock.mockReset();
    (revalidatePath as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pauseShare: shareEnabled=false で update し revalidatePath を呼ぶ", async () => {
    updateMock.mockResolvedValue({});
    const res = await pauseShare("trip1");
    expect(res.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "trip1" },
      data: { shareEnabled: false },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/trips/trip1", "layout");
  });

  it("resumeShare: shareEnabled=true で update し revalidatePath を呼ぶ", async () => {
    updateMock.mockResolvedValue({});
    const res = await resumeShare("trip1");
    expect(res.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "trip1" },
      data: { shareEnabled: true },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/trips/trip1", "layout");
  });

  it("pauseShare: prisma が失敗したら ok:false で revalidate しない", async () => {
    updateMock.mockRejectedValue(new Error("db down"));
    const res = await pauseShare("trip1");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/失敗|エラー/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("resumeShare: prisma が失敗したら ok:false で revalidate しない", async () => {
    updateMock.mockRejectedValue(new Error("db down"));
    const res = await resumeShare("trip1");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/失敗|エラー/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
