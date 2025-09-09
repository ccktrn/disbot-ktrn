FROM oven/bun:latest
RUN apt update && apt install -y curl tar xz-utils zip unzip
WORKDIR /app
COPY ./package.json ./
COPY ./bun.lock ./
RUN bun install
COPY ./scripts ./
RUN bun run setup
COPY . .
CMD ["bun", "run", "start"]