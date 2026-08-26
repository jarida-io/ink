/**
 * The only globals this library assumes exist on every platform it runs on.
 *
 * Listing them rather than pulling in `lib.dom` is deliberate: the native
 * type-check runs without DOM types precisely so that a `document` or a
 * `window` reaching `src/native` or `src/core` fails the build instead of
 * failing on a device.
 */
declare const console: {
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  log(...args: unknown[]): void;
};
