# Discord Bot in Typescript

このプロジェクトは、TypeScriptとBunで構築された多機能なDiscord Botです。

## 主な機能

- **LLM連携 (OpenAI)**
  - OpenAIのAPIを利用した、メンションや特定キーワードに対する自動応答・対話機能。
- **リマインダー機能**
  - 指定した日時に通知を送るリマインダーの設定・管理。
- **動画ダウンロード機能 (yt-dlp)**
  - YouTubeなどの動画リンクから、yt-dlpを用いて動画をダウンロード・共有する機能。

## 使い方・起動方法

`.env`ファイルを適切に設定した後、Docker Composeを使用して起動します。

**テスト起動:**
```sh
bun run dev
```

**バックグラウンド(デーモン)起動:**
```sh
docker compose up -d
```
