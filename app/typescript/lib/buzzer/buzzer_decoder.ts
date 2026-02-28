import { parseSerialProtocolLine, type SerialProtocolSignal } from "./serial_protocol";

/**
 * Uint8Array のチャンクを受け取り、改行区切りでパースして SerialProtocolSignal を返すデコーダ。
 * DOM に依存しないため Worker・テスト双方で使用できる。
 */
export class BuzzerDecoder {
  readonly #textDecoder = new TextDecoder();
  #buffer = "";

  /**
   * バイト列チャンクを処理し、完結した行のシグナルを返す。
   * 不完全な行はバッファに残る。
   */
  processChunk(chunk: Uint8Array): SerialProtocolSignal[] {
    const decoded = this.#textDecoder.decode(chunk, { stream: true });
    return this.#processText(decoded);
  }

  /**
   * バッファに残った未完結の行を強制的に処理して返す。
   * ストリーム終了時（切断時）に呼ぶ。
   */
  flush(): SerialProtocolSignal[] {
    // TextDecoder の内部バッファをフラッシュする
    const tail = this.#textDecoder.decode();
    const signals = this.#processText(tail);

    if (this.#buffer.length > 0) {
      signals.push(parseSerialProtocolLine(this.#buffer));
      this.#buffer = "";
    }

    return signals;
  }

  #processText(text: string): SerialProtocolSignal[] {
    const lines = `${this.#buffer}${text}`.split(/\r?\n/);
    // 最後の要素は改行で終端していない残バッファ
    this.#buffer = lines.pop() ?? "";

    const signals: SerialProtocolSignal[] = [];
    for (const line of lines) {
      signals.push(parseSerialProtocolLine(line));
    }
    return signals;
  }
}
