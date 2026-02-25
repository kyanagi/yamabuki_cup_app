import type { QuestionId } from "../../lib/quiz_reader/question_id";
import type { SoundId } from "../../lib/quiz_reader/sound_id";

// 「問題」と問題文の間の空白時間の長さ（ms）
const INTERVAL_AFTER_MONDAI_MS = 300;

// ファイルが見つからない場合のカスタムエラー
class FileNotFoundError extends Error {
  constructor(public filename: string) {
    super(`File not found: ${filename}`);
    this.name = "FileNotFoundError";
  }
}

export type VoiceStatus = "STANDBY" | "PLAYING" | "PAUSED";
export type LoadingStatus = "NOT_LOADED" | "LOADING" | "LOADED";

export async function loadAudioFromLocalFile(
  filename: string,
  dirHandle: FileSystemDirectoryHandle,
  audioContext: AudioContext,
  signal: AbortSignal,
): Promise<AudioBuffer> {
  // AbortSignal をチェック
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  console.log(`Loaded local audio: ${filename}`);
  return await audioContext.decodeAudioData(arrayBuffer);
}

export type QuestionReadingContext = {
  load(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  reset(): void;
  dispose(): void;
  get questionId(): QuestionId;
  get fullDuration(): number;
  get readDuration(): number;
  get voiceStatus(): VoiceStatus;
  set loadingStatus(s: LoadingStatus);
};

export function createQuestionReadingContext(
  questionId: QuestionId,
  soundId: SoundId,
  audioContext: AudioContext,
  dirHandle: FileSystemDirectoryHandle,
  onLoadingStatusChanged?: (s: LoadingStatus) => void,
  onVoiceStatusChanged?: (s: VoiceStatus) => void,
  onFileNotFound?: (filename: string) => void,
  outputNode?: AudioNode,
): QuestionReadingContext {
  // 出力先を決定（outputNodeが指定されていなければaudioContext.destinationを使用）
  const destination = outputNode ?? audioContext.destination;
  let voiceStatus: VoiceStatus = "STANDBY";
  let currentSource: AudioBufferSourceNode | undefined;
  let startTime: number | undefined;
  let stopTime: number | undefined;
  let questionDuration: number | undefined;
  let audioBuffersPromise: Promise<[AudioBuffer, AudioBuffer]> | undefined;
  let abortController = new AbortController();
  let loadFailed = false;

  function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        reject();
      };
      abortController.signal.addEventListener("abort", abortHandler, {
        once: true,
      });
      currentSource = audioContext.createBufferSource();
      currentSource.buffer = audioBuffer;
      currentSource.connect(destination);
      // note: onended は stop() が呼ばれたときも呼ばれるが、
      // stop() の呼び出し元の処理が終わってからでないと onended は呼ばれない。
      currentSource.onended = () => {
        abortController.signal.removeEventListener("abort", abortHandler);
        if (stopTime === undefined) {
          stopTime = audioContext.currentTime;
        }
        resolve();
      };
      currentSource.start();
    });
  }

  function setVoiceStatus(s: VoiceStatus) {
    voiceStatus = s;
    onVoiceStatusChanged?.(s);
  }

  setVoiceStatus(voiceStatus);

  return {
    async load() {
      if (audioBuffersPromise) return;

      this.loadingStatus = "LOADING";

      const createAudioBufferPromise = (filename: string) => {
        return new Promise<AudioBuffer>((resolve, reject) => {
          const abortHandler = () => reject(new DOMException("Aborted", "AbortError"));
          abortController.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
          loadAudioFromLocalFile(filename, dirHandle, audioContext, abortController.signal)
            .then((buffer) => {
              resolve(buffer);
            })
            .catch((error) => {
              // NotFoundError をファイル名付きのカスタムエラーに変換
              if (error instanceof DOMException && error.name === "NotFoundError") {
                reject(new FileNotFoundError(filename));
              } else {
                reject(error);
              }
            })
            .finally(() => {
              abortController.signal.removeEventListener("abort", abortHandler);
            });
        });
      };

      const mondaiFilename = "mondai.wav";
      const questionFilename = `question${soundId}.wav`;

      try {
        const mondaiAudioBufferPromise = createAudioBufferPromise(mondaiFilename);
        const questionAudioBufferPromise = createAudioBufferPromise(questionFilename);
        audioBuffersPromise = Promise.all([mondaiAudioBufferPromise, questionAudioBufferPromise]);
        questionDuration = (await audioBuffersPromise)[1].duration;
        this.loadingStatus = "LOADED";
      } catch (e) {
        audioBuffersPromise = undefined;
        loadFailed = true;
        if (e instanceof FileNotFoundError) {
          onFileNotFound?.(e.filename);
        } else if (e instanceof Error) {
          console.error(e);
        }
        this.loadingStatus = "NOT_LOADED";
      }
    },

    async start() {
      if (this.voiceStatus !== "STANDBY") return;
      if (loadFailed) return;

      try {
        setVoiceStatus("PLAYING");
        await this.load();

        // load() でエラーが発生した場合、audioBuffersPromise は undefined のまま
        if (!audioBuffersPromise) {
          setVoiceStatus("STANDBY");
          return;
        }

        const [mondaiAudioBuffer, questionAudioBuffer] = await audioBuffersPromise;

        await playAudioBuffer(mondaiAudioBuffer);

        // 「問題」と問題文の間の空白
        await new Promise<void>((resolve, reject) => {
          const abortHandler = () => reject();
          abortController.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
          setTimeout(() => {
            abortController.signal.removeEventListener("abort", abortHandler);
            resolve();
          }, INTERVAL_AFTER_MONDAI_MS);
        });

        startTime = audioContext.currentTime;
        stopTime = undefined;
        await playAudioBuffer(questionAudioBuffer);
      } catch (e) {
        if (e instanceof Error) {
          setVoiceStatus("STANDBY");
          console.error(e);
        }
      }
    },

    stop() {
      setVoiceStatus("PAUSED");
      if (currentSource) {
        if (stopTime === undefined) {
          stopTime = audioContext.currentTime;
        }
        currentSource.stop();
        currentSource.disconnect();
        currentSource = undefined;
      }
      abortController.abort();
    },

    reset() {
      this.stop();
      abortController = new AbortController();
      startTime = undefined;
      stopTime = undefined;
      loadFailed = false;
      setVoiceStatus("STANDBY");
    },

    dispose() {
      this.stop();
      audioBuffersPromise = undefined;
      loadFailed = false;
    },

    get questionId() {
      return questionId;
    },
    get fullDuration() {
      return questionDuration ?? 0;
    },
    get readDuration() {
      if (startTime === undefined || stopTime === undefined) return 0;
      const d = stopTime - startTime;
      return d > this.fullDuration ? this.fullDuration : d;
    },
    get voiceStatus() {
      return voiceStatus;
    },
    set loadingStatus(s: LoadingStatus) {
      onLoadingStatusChanged?.(s);
    },
  };
}
