export const env = (k: string): string =>
  (import.meta.env as Record<string, string | undefined> | undefined)?.[k] ?? process.env[k] ?? "";
