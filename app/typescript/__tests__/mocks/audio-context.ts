/**
 * AudioContext / AudioBufferSourceNode / GainNode のモック
 */

/**
 * GainNode のモック
 */
export class MockGainNode {
  gain = {
    value: 1.0,
  };

  private _connected = false;
  connectedTo: AudioNode | AudioParam | null = null;

  connect(destination: AudioNode | AudioParam): void {
    this._connected = true;
    this.connectedTo = destination;
  }

  disconnect(): void {
    this._connected = false;
    this.connectedTo = null;
  }

  get isConnected(): boolean {
    return this._connected;
  }
}

export class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;

  private _connected = false;
  private _started = false;
  connectedTo: AudioNode | AudioParam | null = null;

  connect(destination: AudioNode | AudioParam): void {
    this._connected = true;
    this.connectedTo = destination;
  }

  disconnect(): void {
    this._connected = false;
    this.connectedTo = null;
  }

  start(): void {
    this._started = true;
    // autoCompleteが有効な場合、次のマイクロタスクでonendedを呼ぶ
    if (MockAudioBufferSourceNode.autoComplete) {
      queueMicrotask(() => {
        this.onended?.();
      });
    }
  }

  stop(): void {
    if (this._started) {
      this.onended?.();
    }
  }

  // テスト用: 再生完了をシミュレート
  simulateEnded(): void {
    this.onended?.();
  }

  // テスト用: 自動で再生完了するかどうか（デフォルトはtrue）
  static autoComplete = true;

  // テスト用: 接続状態を確認
  get isConnected(): boolean {
    return this._connected;
  }
}

export function createMockAudioBuffer(duration = 5.0): AudioBuffer {
  return {
    duration,
    length: 44100 * duration,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: () => new Float32Array(44100 * duration),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;
}

export class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {} as AudioDestinationNode;

  private _closed = false;

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // テスト用の AudioBuffer を返す
    return createMockAudioBuffer(5.0);
  }

  async close(): Promise<void> {
    this._closed = true;
    this.state = "closed";
  }

  // テスト用: 時間を進める
  advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }

  // テスト用: クローズ状態を確認
  get isClosed(): boolean {
    return this._closed;
  }
}
