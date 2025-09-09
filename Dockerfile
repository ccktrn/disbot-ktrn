FROM oven/bun:latest
RUN apt update && apt install -y curl tar xz-utils zip unzip
WORKDIR /app
RUN bun run setup
COPY ./package.json ./
COPY ./bun.lock ./
RUN bun install
COPY . .
CMD ["bun", "run", "start"]