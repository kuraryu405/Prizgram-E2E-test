# Evidence Policy

Prizgram E2E の目的は「通った/落ちた」だけでなく、ユーザー操作が成立した証拠を再現可能な形で残すことです。

## 成果物

各 test run では次を保存します。

1. **MP4 video** — 人が確認する主証跡
2. **PNG screenshots** — 重要 checkpoint
3. **Playwright trace.zip** — DOM / network / console / action timeline の調査用
4. **HTML report** — suite 全体の索引

Playwright は内部的に WebM を録画します。`scripts/run-playwright.mjs` がテスト終了後に ffmpeg で H.264 MP4 を生成します。

- MP4: レビュー・デモ・Issue添付用の正式動画
- raw WebM: Playwright HTML report の attachment 互換性のため内部保持

## MP4 specification

- container: MP4
- video codec: H.264 (`libx264`)
- pixel format: `yuv420p`
- CRF: 23
- `faststart` enabled

これにより GitHub artifact からダウンロードした動画を一般的なブラウザ/プレイヤーで再生しやすくします。

## screenshot naming

`evidenceStep()` を利用し、テスト結果ディレクトリ配下に以下の形式で保存します。

```text
artifacts/test-results/<test>/evidence/
  01-<step>.png
  02-<step>.png
  ...
```

日本語step名も許可しますが、ファイル名に不適切な記号は slug 化します。

## 何を撮るか

良い証跡:

- action の結果が画面に反映された後
- success state と対象データが同時に見える
- before/after が必要なら両方撮る
- AI機能なら生成結果だけでなくユーザーが編集可能なUIも写す
- Human-in-the-loop の境界では「承認前」と「承認後」を分ける

悪い証跡:

- button を押す直前だけ
- loading中だけ
- ページ上部だけで結果が見えていない
- 一時 toast だけで永続状態が確認できない

## failure evidence

テスト失敗時は可能な限り次を残します。

- failure screenshot
- trace
- video / MP4
- console error
- `pageerror`
- failed request URL / method / failure reason

console / request logging は将来共通 fixture に統合します。

## CI artifact split

推奨:

### `evidence-mp4`

レビュー時にまず見るもの。

```text
**/*.mp4
**/evidence/*.png
```

### `playwright-debug`

障害調査用。

```text
artifacts/test-results/**
playwright-report/**
```

raw WebM は debug artifact にのみ含め、主成果物として案内しません。

## retention

- PR / Issue 開発中: GitHub Actions の標準 retention
- リリース候補 / デモ: 必要な MP4 を release asset または明示的な保存先へ移す
- 個人情報や本物の応募情報を含む動画は保存しない

## 本番環境

本番ではデフォルトで read-only smoke のみ許可します。

mutable test は `E2E_ALLOW_MUTATION=true` が必要です。さらに production hostname の場合は `E2E_ALLOW_PRODUCTION=true` が必要ですが、通常は設定しません。

正式な mutable E2E は disposable / staging / preview environment を使用します。
