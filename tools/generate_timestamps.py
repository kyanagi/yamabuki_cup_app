#!/usr/bin/env python3
"""
stable-ts を使って音声ファイルと問題文テキストの強制アライメントを行い、
各文字のタイムスタンプ JSON を生成するツール。

依存ライブラリ:
    pip install stable-ts

使い方:
    # 単一ファイル（出力: 音声ファイルと同じディレクトリに .json を生成）
    python tools/generate_timestamps.py question1.wav "問題文テキスト"

    # 出力先を指定
    python tools/generate_timestamps.py question1.wav "問題文テキスト" --output-dir /path/to/output

    # バッチ処理（CSVファイルと音声フォルダを指定）
    # CSV形式: sound_id,text
    python tools/generate_timestamps.py --batch /path/to/audio_folder questions.csv
"""

import argparse
import csv
import json
import sys
from pathlib import Path


def load_model(model_size: str = "large-v3"):
    """Whisper モデルを読み込む"""
    try:
        import stable_whisper
    except ImportError:
        print("エラー: stable-ts がインストールされていません。", file=sys.stderr)
        print("  pip install stable-ts", file=sys.stderr)
        sys.exit(1)

    print(f"モデルを読み込んでいます: {model_size}")
    return stable_whisper.load_model(model_size)


def align_audio_with_text(
    model, audio_path: str, text: str, language: str = "ja"
) -> dict:
    """
    音声ファイルと既知テキストを強制アライメントして文字単位のタイムスタンプを返す。

    stable-ts の align() は単語単位のタイムスタンプを返すため、
    各単語内の文字に対して時刻を線形補間する。

    戻り値:
        {
            "text": "問題文全体のテキスト",
            "chars": [
                {"char": "問", "start": 0.0, "end": 0.12},
                ...
            ]
        }
    """
    print(f"アライメント実行中: {audio_path}")
    result = model.align(audio_path, text, language=language)

    chars = []
    for segment in result.segments:
        if not hasattr(segment, "words") or segment.words is None:
            print(f"  警告: セグメントに単語情報がありません: '{segment.text}'", file=sys.stderr)
            continue

        for word in segment.words:
            word_text = word.word
            # stable-ts は単語の前後にスペースを含む場合があるため、
            # スペースを除去した文字列で文字数を計算する
            stripped = word_text.strip()
            if not stripped:
                continue

            word_start = word.start
            word_end = word.end

            if word_start is None or word_end is None:
                print(
                    f"  警告: タイムスタンプが取得できない単語をスキップします: '{stripped}'",
                    file=sys.stderr,
                )
                continue

            word_duration = word_end - word_start
            n_chars = len(stripped)

            # 単語内の各文字に時刻を線形補間
            for i, char in enumerate(stripped):
                char_start = word_start + (word_duration * i / n_chars)
                char_end = word_start + (word_duration * (i + 1) / n_chars)
                chars.append(
                    {
                        "char": char,
                        "start": round(char_start, 4),
                        "end": round(char_end, 4),
                    }
                )

    # text（スペース類を除く）と抽出した chars が完全に一致することを検証する。
    # セグメント欠落や start/end 欠損で文字が脱落した場合、下流でインデックスがずれるため、
    # 不一致なら ValueError を投げて呼び出し元に失敗を伝える。
    expected = "".join(c for c in text if not c.isspace())
    extracted = "".join(entry["char"] for entry in chars)
    if expected != extracted:
        raise ValueError(
            f"文字の欠落が検出されました（期待: {len(expected)} 文字, "
            f"取得: {len(extracted)} 文字）\n"
            f"  期待: {expected}\n"
            f"  取得: {extracted}"
        )

    return {"text": text, "chars": chars}


def process_single(
    model, audio_path: Path, text: str, output_dir: Path | None, language: str
) -> Path:
    """
    単一の音声ファイルを処理して JSON を生成する。

    戻り値: 生成した JSON ファイルのパス
    """
    if not audio_path.exists():
        print(f"エラー: 音声ファイルが見つかりません: {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        result = align_audio_with_text(model, str(audio_path), text, language=language)
    except ValueError as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)

    dest_dir = output_dir if output_dir is not None else audio_path.parent
    dest_dir.mkdir(parents=True, exist_ok=True)
    output_path = dest_dir / audio_path.with_suffix(".json").name

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    char_count = len(result["chars"])
    print(f"  → {output_path} ({char_count} 文字)")
    return output_path


def process_batch(
    model, audio_dir: Path, csv_path: Path, output_dir: Path | None, language: str
) -> None:
    """
    CSV ファイルに記載された sound_id とテキストの一覧を一括処理する。

    CSV フォーマット:
        sound_id,text
        1,問題文その1
        2,問題文その2
    """
    if not csv_path.exists():
        print(f"エラー: CSV ファイルが見つかりません: {csv_path}", file=sys.stderr)
        sys.exit(1)

    if not audio_dir.exists():
        print(f"エラー: 音声フォルダが見つかりません: {audio_dir}", file=sys.stderr)
        sys.exit(1)

    with csv_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print("CSV に処理対象がありません。", file=sys.stderr)
        return

    success_count = 0
    error_count = 0

    for row in rows:
        sound_id = row.get("sound_id", "").strip()
        text = row.get("text", "").strip()

        if not sound_id or not text:
            print(f"  警告: 不正な行をスキップします: {row}", file=sys.stderr)
            error_count += 1
            continue

        audio_path = audio_dir / f"question{sound_id}.wav"

        try:
            process_single(model, audio_path, text, output_dir, language)
            success_count += 1
        except SystemExit:
            error_count += 1
            print(f"  エラー: sound_id={sound_id} の処理をスキップします", file=sys.stderr)

    print(f"\nバッチ処理完了: 成功={success_count}, エラー={error_count}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="音声ファイルと問題文テキストから文字単位のタイムスタンプ JSON を生成する"
    )
    parser.add_argument(
        "--model",
        default="large-v3",
        help="Whisper モデルサイズ (デフォルト: large-v3)",
    )
    parser.add_argument(
        "--language",
        default="ja",
        help="言語コード (デフォルト: ja)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="出力先ディレクトリ (デフォルト: 音声ファイルと同じ場所)",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="バッチモード: audio_dir と CSV ファイルを指定して一括処理する",
    )
    parser.add_argument(
        "audio_or_dir",
        type=Path,
        help="音声ファイルのパス（通常モード）または音声フォルダのパス（バッチモード）",
    )
    parser.add_argument(
        "text_or_csv",
        help="問題文テキスト（通常モード）または CSV ファイルのパス（バッチモード）",
    )

    args = parser.parse_args()

    model = load_model(args.model)

    if args.batch:
        audio_dir = args.audio_or_dir
        csv_path = Path(args.text_or_csv)
        process_batch(model, audio_dir, csv_path, args.output_dir, args.language)
    else:
        audio_path = args.audio_or_dir
        text = args.text_or_csv
        process_single(model, audio_path, text, args.output_dir, args.language)


if __name__ == "__main__":
    main()
