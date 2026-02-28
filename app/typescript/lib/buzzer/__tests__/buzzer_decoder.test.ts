import { describe, expect, it } from "vitest";
import { BuzzerDecoder } from "../buzzer_decoder";

const encoder = new TextEncoder();

function encode(text: string): Uint8Array {
  return encoder.encode(text);
}

describe("BuzzerDecoder", () => {
  it("改行区切りの1チャンクで SerialProtocolSignal[] を返す", () => {
    const decoder = new BuzzerDecoder();
    const signals = decoder.processChunk(encode("2\r\n99\r\n"));
    expect(signals).toHaveLength(2);
    expect(signals[0]).toEqual({ type: "button_pressed", buttonId: 2 });
    expect(signals[1]).toEqual({ type: "reset" });
  });

  it("\\r\\n を分割受信してもバッファリングで正しく処理する", () => {
    const decoder = new BuzzerDecoder();
    const s1 = decoder.processChunk(encode("2\r"));
    expect(s1).toHaveLength(0);
    const s2 = decoder.processChunk(encode("\n99\r"));
    expect(s2).toHaveLength(1);
    expect(s2[0]).toEqual({ type: "button_pressed", buttonId: 2 });
    const s3 = decoder.processChunk(encode("\n"));
    expect(s3).toHaveLength(1);
    expect(s3[0]).toEqual({ type: "reset" });
  });

  it("改行なしで終端した残バッファを flush() で処理する", () => {
    const decoder = new BuzzerDecoder();
    const s1 = decoder.processChunk(encode("2"));
    expect(s1).toHaveLength(0);
    const s2 = decoder.flush();
    expect(s2).toHaveLength(1);
    expect(s2[0]).toEqual({ type: "button_pressed", buttonId: 2 });
  });

  it("flush() 後に processChunk を呼んでも正常に動作する", () => {
    const decoder = new BuzzerDecoder();
    decoder.processChunk(encode("2"));
    decoder.flush();
    const s = decoder.processChunk(encode("99\r\n"));
    expect(s).toHaveLength(1);
    expect(s[0]).toEqual({ type: "reset" });
  });

  it("51=correct, 52=wrong をそれぞれ変換する", () => {
    const decoder = new BuzzerDecoder();
    const signals = decoder.processChunk(encode("51\r\n52\r\n"));
    expect(signals[0]).toEqual({ type: "correct" });
    expect(signals[1]).toEqual({ type: "wrong" });
  });

  it("空チャンクを渡しても空配列を返す", () => {
    const decoder = new BuzzerDecoder();
    expect(decoder.processChunk(encode(""))).toHaveLength(0);
  });

  it("残バッファが空のときの flush() は空配列を返す", () => {
    const decoder = new BuzzerDecoder();
    expect(decoder.flush()).toHaveLength(0);
  });
});
