/**
 * Whether we are allowed to spend cycles telling you that you were wrong.
 *
 * Bundlers disagree about how to say "development": Vite has
 * `import.meta.env.DEV`, Metro has the `__DEV__` global, Node has
 * `process.env.NODE_ENV`. Reading any one of them directly throws somewhere, so
 * this reads all three defensively and lets a host override the answer.
 */
let override: boolean | undefined;

/** Force the answer. Tests use this; a product could use it to silence dev aids. */
export function configureInk(options: { dev?: boolean }): void {
  override = options.dev;
}

export function isDev(): boolean {
  if (override !== undefined) return override;
  try {
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    if (typeof dev === "boolean") return dev;
  } catch {
    /* not Metro */
  }
  try {
    const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
    if (env && typeof env.NODE_ENV === "string") return env.NODE_ENV !== "production";
  } catch {
    /* not Node */
  }
  return false;
}

/** Warn once per message. A budget complaint in a list would print per row. */
const said = new Set<string>();

export function warnOnce(message: string): void {
  if (!isDev() || said.has(message)) return;
  said.add(message);
  // eslint-disable-next-line no-console
  console.warn(`ink: ${message}`);
}

/** Tests reset the ledger so one file's warning does not silence the next. */
export function resetWarnings(): void {
  said.clear();
}
