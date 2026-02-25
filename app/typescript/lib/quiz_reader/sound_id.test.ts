import { describe, expect, it } from "vitest";
import { createSoundId, isSoundId } from "./sound_id";

describe("isSoundId", () => {
  it("1文字以上の文字列を有効とする", () => {
    expect(isSoundId("001")).toBe(true);
    expect(isSoundId("abc")).toBe(true);
    expect(isSoundId(" ")).toBe(true);
  });

  it("空文字列を無効とする", () => {
    expect(isSoundId("")).toBe(false);
  });
});

describe("createSoundId", () => {
  it("有効な文字列から SoundId を生成する", () => {
    expect(createSoundId("001")).toBe("001");
    expect(createSoundId("abc")).toBe("abc");
    expect(createSoundId(" ")).toBe(" ");
  });

  it("空文字列の場合は null を返す", () => {
    expect(createSoundId("")).toBeNull();
  });
});
