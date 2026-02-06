FROM oven/bun:latest

# 1. setup.sh の実行に必要なツール + python3 + nodejs をインストール ( ytdlp の動作安定化のため)
RUN apt-get update && \
    apt-get install -y \
    python3 \
    nodejs \
    curl \
    tar \
    xz-utils \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. 依存関係のインストール
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# 3. ソースとsetup.shをコピー
COPY . .

# 4. setup.sh を実行してバイナリを配置
# ※ setup.sh に実行権限がない場合に備えて chmod
RUN chmod +x ./scripts/setup.sh && ./scripts/setup.sh

# ★重要: setup.sh が配置した bin フォルダにパスを通す
# これでコード内でパスを指定しなくても 'ffmpeg' コマンドが通るようになります
ENV PATH="/app/bin:${PATH}"

# 5. 実行
CMD ["bun", "run", "start"]