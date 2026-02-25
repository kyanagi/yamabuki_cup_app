import { describe, expect, it } from "vitest";
import { parseSerialProtocolLine } from "./serial_protocol";

describe("parseSerialProtocolLine", () => {
  it("1..24 は button_pressed として解釈する", () => {
    expect(parseSerialProtocolLine("1")).toEqual({ type: "button_pressed", buttonId: 1 });
    expect(parseSerialProtocolLine("24")).toEqual({ type: "button_pressed", buttonId: 24 });
  });

  it("51 は correct として解釈する", () => {
    expect(parseSerialProtocolLine("51")).toEqual({ type: "correct" });
  });

  it("52 は wrong として解釈する", () => {
    expect(parseSerialProtocolLine("52")).toEqual({ type: "wrong" });
  });

  it("99 は reset として解釈する", () => {
    expect(parseSerialProtocolLine("99")).toEqual({ type: "reset" });
  });

  it("101..124 はログ信号として解釈する", () => {
    expect(parseSerialProtocolLine("101")).toEqual({
      type: "log",
      raw: "101",
      message: "0",
    });
    expect(parseSerialProtocolLine("124")).toEqual({
      type: "log",
      raw: "124",
      message: "23",
    });
  });

  it("非数値文字列はログ信号として解釈する", () => {
    expect(parseSerialProtocolLine("WASEDA-SHIKI QUIZ HAYAOSHIKI")).toEqual({
      type: "log",
      raw: "WASEDA-SHIKI QUIZ HAYAOSHIKI",
      message: "WASEDA-SHIKI QUIZ HAYAOSHIKI",
    });
  });

  it("規定外の数値はログ信号として解釈する", () => {
    expect(parseSerialProtocolLine("0")).toEqual({
      type: "log",
      raw: "0",
      message: "0",
    });
    expect(parseSerialProtocolLine("125")).toEqual({
      type: "log",
      raw: "125",
      message: "125",
    });
  });
});
