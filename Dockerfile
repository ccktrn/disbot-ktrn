FROM oven/bun:latest
RUN apt update && apt install -y curl tar xz-utils zip unzip
WORKDIR /app
COPY ./package.json ./
COPY ./bun.lock ./
RUN bun install
COPY . .
RUN bun run setup
CMD ["bun", "run", "start"]