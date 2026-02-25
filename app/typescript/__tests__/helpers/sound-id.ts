import { createSoundId, type SoundId } from "../../lib/quiz_reader/sound_id";

export function testSoundId(value: string): SoundId {
  const soundId = createSoundId(value);
  if (soundId === null) {
    throw new Error(`テスト用 SoundId の生成に失敗しました: ${JSON.stringify(value)}`);
  }
  return soundId;
}
