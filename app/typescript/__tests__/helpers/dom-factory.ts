/**
 * テスト用 DOM 要素生成ヘルパー
 */

interface QuizReaderHTMLOptions {
  questionId?: number;
  soundId?: string;
  isOnAir?: boolean;
  isQuestionFollowOn?: boolean;
}

/**
 * QuizReaderController 用の HTML を生成する
 */
export function createQuizReaderHTML(options: QuizReaderHTMLOptions = {}): string {
  const { questionId = 1, soundId = "001", isOnAir = false, isQuestionFollowOn = true } = options;

  return `
    <div
      data-controller="quiz-reader"
      data-quiz-reader-question-id-value="${questionId}"
      data-quiz-reader-sound-id-value="${soundId}"
    >
      <input
        type="checkbox"
        data-quiz-reader-target="isOnAir"
        ${isOnAir ? "checked" : ""}
      />
      <span data-quiz-reader-target="onAirLabel">問い読みOFF</span>
      <input
        type="checkbox"
        data-quiz-reader-target="isQuestionFollowOn"
        ${isQuestionFollowOn ? "checked" : ""}
      />
      <span data-quiz-reader-target="questionFollowLabel">${isQuestionFollowOn ? "問題フォローON" : "問題フォローOFF"}</span>
      <span data-quiz-reader-target="duration"></span>

      <!-- Loading status icons -->
      <span data-quiz-reader-target="voiceLoadingStatusIcon voiceLoadingIcon" class="is-hidden"></span>
      <span data-quiz-reader-target="voiceLoadingStatusIcon voiceLoadedIcon" class="is-hidden"></span>

      <!-- Play status icons -->
      <span data-quiz-reader-target="playStatusIcon stopIcon" class="is-hidden"></span>
      <span data-quiz-reader-target="playStatusIcon playIcon" class="is-hidden"></span>
      <span data-quiz-reader-target="playStatusIcon pauseIcon" class="is-hidden"></span>

      <!-- Result uploading status icons -->
      <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadingIcon" class="is-hidden"></span>
      <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadedIcon" class="is-hidden"></span>
      <span data-quiz-reader-target="resultUploadingStatusIcon resultUploadErrorIcon" class="is-hidden"></span>

      <!-- Folder selection -->
      <span data-quiz-reader-target="folderStatus" class="has-text-grey">未選択</span>
      <button data-quiz-reader-target="settingsButton" class="button is-warning">設定</button>
      <p data-quiz-reader-target="mainError" class="is-hidden"></p>

      <!-- Volume control -->
      <input type="number" min="0" max="100" step="1" value="100" data-quiz-reader-target="volumeInput" data-action="input->quiz-reader#setVolumeFromInput" />
      <input type="range" min="0" max="100" value="100" data-quiz-reader-target="volumeSlider" data-action="input->quiz-reader#setVolumeFromSlider" />

      <!-- Next questions -->
      <div data-quiz-reader-target="nextQuestions"></div>

      <!-- Settings modal -->
      <div data-quiz-reader-target="settingsModal" class="modal">
        <!-- Sample audio buttons -->
        <button data-quiz-reader-target="samplePlayButton" disabled data-action="click->quiz-reader#playSampleAudio">再生</button>
        <button data-quiz-reader-target="sampleStopButton" disabled data-action="click->quiz-reader#stopSampleAudio">停止</button>
      </div>
    </div>
  `;
}
