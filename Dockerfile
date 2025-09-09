FROM oven/bun:latest

WORKDIR /app
COPY ./package.json ./
COPY ./bun.lock ./
RUN bun install
COPY . .
RUN bun run setup
CMD ["bun", "run", "start"]