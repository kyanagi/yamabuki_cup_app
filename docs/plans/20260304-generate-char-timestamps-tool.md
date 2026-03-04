# タイムスタンプ生成ツールの実装

## Context

現在 `question_readings` テーブルには音声の再生秒数（`read_duration` / `full_duration`）を保存しているが、「問題文の何文字目まで読んだか」は保存していない。早押しクイズでは読み上げ位置（文字インデックス）が重要なため、音声と問題文テキストをアライメントして文字単位タイムスタンプJSONを生成するツールを作成する。

フロントエンド・バックエンド変更は後続タスクとし、今回はツール作成のみを行う。

## 生成するタイムスタンプ生成ツール

**新規作成: `tools/generate_timestamps.py`**

### 依存ライブラリ

- `stable-ts`（`pip install stable-ts`）
- `faster-whisper`（stable-tsの依存として自動インストール）

### 処理概要

```
入力: 音声ファイル(.wav) + 問題文テキスト
  ↓
stable_whisper.load_model("large-v3")
  ↓
model.align(audio_path, text, language="ja")  ← 強制アライメント
  ↓
文字レベルのタイムスタンプを抽出・整形
  ↓
出力: 音声ファイルと同名の .json（例: question1.wav → question1.json）
```

### CLIインタフェース

```bash
# 単一ファイル
python tools/generate_timestamps.py question1.wav "問題文テキスト"

# 出力先を指定
python tools/generate_timestamps.py question1.wav "問題文テキスト" --output-dir /path/to/folder

# バッチ処理（フォルダ内の全 question*.wav を処理）
# CSVフォーマット: sound_id,text
python tools/generate_timestamps.py --batch /path/to/audio_folder questions.csv
```

### 出力 JSON フォーマット

```json
{
  "text": "問題文全体のテキスト",
  "chars": [
    { "char": "問", "start": 0.0, "end": 0.12 },
    { "char": "題", "start": 0.12, "end": 0.24 }
  ]
}
```

### 実装ポイント

- `stable_whisper` の `align()` メソッドで既知テキストを音声にアライメント（文字起こしではなく強制アライメント）
- `result.segments[*].words[*]` から `start`/`end` を取得して文字単位に分解
- スペース・句読点もそのまま含める（インデックスをテキストと一対一対応させるため）
- 全文字に時刻が割り当てられない場合（アライメント失敗）は警告を出力してスキップ

### バッチCSVフォーマット

```csv
sound_id,text
1,問題文その1
2,問題文その2
```

→ `question1.json`, `question2.json` を生成

## 変更ファイル一覧

| ファイル                       | 変更種別 |
| ------------------------------ | -------- |
| `tools/generate_timestamps.py` | 新規作成 |

## 検証手順

1. `pip install stable-ts` で依存ライブラリをインストール
2. サンプル音声ファイルで動作確認:
   ```bash
   python tools/generate_timestamps.py test.wav "テスト問題文"
   ```
3. 出力JSONの `chars` 配列に全文字のタイムスタンプが含まれることを確認
4. バッチモードでフォルダ内の複数ファイルを一括処理できることを確認
