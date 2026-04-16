export const config = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  WS_PATH: process.env.WS_PATH ?? '/ws',
  MAX_HISTORY: parseInt(process.env.MAX_HISTORY ?? '100', 10),
  ROOM_NAME_PATTERN: /^[a-z0-9-]+$/,
  ROOM_NAME_MAX_LENGTH: 64,
}
