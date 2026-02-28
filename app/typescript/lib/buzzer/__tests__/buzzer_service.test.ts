import { describe, expect, it } from "vitest";
import { createBuzzerService } from "../buzzer_service";
import type { SerialProtocolSignal } from "../serial_protocol";

const encoder = new TextEncoder();

describe("BuzzerService", () => {
  it("processChunk が BuzzerDecoder に委譲されシグナルが onSignal ハンドラに届く", () => {
    const service = createBuzzerService();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    // "2\r\n" → button_pressed(2)、"99\r\n" → reset
    service.processChunk(encoder.encode("2\r\n99\r\n"));

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ type: "button_pressed", buttonId: 2 });
    expect(received[1]).toEqual({ type: "reset" });
  });

  it("flush() が BuzzerDecoder.flush() に委譲されシグナルが届く", () => {
    const service = createBuzzerService();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    // 改行なしで processChunk → バッファに残る → flush で確定
    service.processChunk(encoder.encode("2"));
    expect(received).toHaveLength(0);

    service.flush();
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "button_pressed", buttonId: 2 });
  });

  it("terminate() 後の processChunk は onSignal を呼ばない", () => {
    const service = createBuzzerService();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    service.terminate();
    service.processChunk(encoder.encode("2\r\n"));

    expect(received).toHaveLength(0);
  });

  it("terminate() 後の flush は onSignal を呼ばない", () => {
    const service = createBuzzerService();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    service.processChunk(encoder.encode("2"));
    service.terminate();
    service.flush();

    expect(received).toHaveLength(0);
  });

  it("onSignal のクリーンアップ関数を呼ぶと購読が解除される", () => {
    const service = createBuzzerService();
    const received: SerialProtocolSignal[] = [];
    const cleanup = service.onSignal((s) => received.push(s));

    cleanup();
    service.processChunk(encoder.encode("2\r\n"));

    expect(received).toHaveLength(0);
  });

  it("複数の onSignal ハンドラが全て呼ばれる", () => {
    const service = createBuzzerService();
    const received1: SerialProtocolSignal[] = [];
    const received2: SerialProtocolSignal[] = [];
    service.onSignal((s) => received1.push(s));
    service.onSignal((s) => received2.push(s));

    service.processChunk(encoder.encode("2\r\n"));

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });
});
