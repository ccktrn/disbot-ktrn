# プロジェクト概要
TypeScriptおよびBunで構築されたDiscord Botプロジェクト。
主な機能として、LLM連携(OpenAI)、リマインダー機能、yt-dlpを利用した機能などを提供する。

# アーキテクチャ
レイヤードアーキテクチャを採用。
Controller(Command/Handler)、Service(ビジネスロジック)、Repository(データアクセス)、Library(外部APIやDBラッパー)の各層に責務を分離し、保守性と拡張性を高めている。

# ディレクトリ構造と役割

- `/src/cmds/`
  Discordの各スラッシュコマンドの定義(コマンド名、説明、実行関数)を格納。
- `/src/handlers/`
  メッセージ受信時や各コマンドのイベントハンドラ、メッセージ送信,返信などの具体的なイベント処理ロジックを格納。
- `/src/services/`
  ビジネスロジック層。リポジトリや外部APIを呼び出し、LLM応答生成やリマインダー監視などの主要な処理を統括する。
- `/src/repositories/`
  データアクセス層。SQLiteなどデータベースへのクエリ操作(保存、取得)を担当。
- `/src/lib/`
  システム全体で利用する汎用処理、外部サービス連携(pCloud、OpenAI等)、DBセットアップなどの処理を格納。
- `/src/wrapper/`
  Discord Clientの初期化処理や外部ライブラリのラッパークラスを格納。
- `/scripts/`
  開発・運用向けの補助スクリプト(.shや.ts)を格納。
- `/data/`
  SQLiteのデータベースファイルなど、永続化データを配置するディレクトリ。(.gitignore)
