/**
 * The tokens, as the custom properties the shipped stylesheets already read.
 *
 * This is what keeps the library honest. `pond-desktop` has ten stylesheets and
 * six thousand lines of `sections.css` written against `--color-accent`,
 * `--shadow-ink`, `--space-4` and the rest. If the library declared its own
 * parallel names, the two would drift within a release and the "single source
 * of truth" would be two sources of truth with a nicer README.
 *
 * So the emitter writes the *existing* names, and `css.test.ts` parses
 * `design-tokens.css` and asserts the two agree. Adopting the library on the
 * web is then one import, not a rewrite, and a token that moves here moves
 * there in the same commit.
 */
import type { InkTheme } from "./theme.js";
import { cssBezier } from "./motion.js";
import { WEB_FONT_STACKS } from "./type.js";

/** `{ "--color-accent": "#7C3AED", ... }` — ordered, stable, alphabetical within group. */
export function cssVariables(theme: InkTheme): Record<string, string> {
  const c = theme.color;
  const px = (n: number) => `${n}px`;

  const vars: Record<string, string> = {
    // Type
    "--font-display": WEB_FONT_STACKS.display,
    "--font-heading": WEB_FONT_STACKS.display,
    "--font-body": WEB_FONT_STACKS.body,
    "--font-mono": WEB_FONT_STACKS.mono,

    "--text-xs": px(theme.size.xs),
    "--text-sm": px(theme.size.sm),
    "--text-base": px(theme.size.base),
    "--text-md": px(theme.size.md),
    "--text-lg": px(theme.size.lg),
    "--text-xl": px(theme.size.xl),
    "--text-2xl": px(theme.size["2xl"]),
    "--text-3xl": px(theme.size["3xl"]),

    "--weight-regular": String(theme.weight.regular),
    "--weight-medium": String(theme.weight.medium),
    "--weight-semibold": String(theme.weight.semibold),
    "--weight-bold": String(theme.weight.bold),

    "--leading-tight": String(theme.leading.tight),
    "--leading-snug": String(theme.leading.snug),
    "--leading-base": String(theme.leading.base),
    "--leading-loose": String(theme.leading.loose),

    // Colour
    "--color-bg": c.bg,
    "--color-surface": c.surface,
    "--color-content": c.content,
    "--color-sidebar": c.chrome,

    "--color-text": c.text,
    "--color-text-secondary": c.textSecondary,
    "--color-text-tertiary": c.textTertiary,
    "--color-text-disabled": c.textDisabled,
    "--color-text-on-accent": c.textOnAccent,

    // The accent chain, resolved. `--pp*` are what the host theme store writes
    // as inline styles on :root, so emitting them keeps `var(--pp, …)`
    // references in the existing stylesheets pointing at the same values.
    "--pp": c.accent,
    "--pp-600": c.accentPressed,
    "--pp-100": c.brandTint,
    "--pp-50": c.brandSoft,
    "--color-accent": c.accent,
    "--color-accent-hover": c.accentPressed,
    "--color-accent-active": c.accentPressed,
    "--color-accent-soft": c.accentSoft,
    "--color-accent-subtle": c.accentSofter,
    "--color-accent-line": c.accentLine,

    "--border-ink": c.ink,
    "--shadow-ink": `${px(theme.edge.rest)} ${px(theme.edge.rest)} 0 ${c.ink}`,
    "--bg-brand-soft": c.brandSoft,

    "--color-border": c.line,
    "--color-border-strong": c.lineStrong,
    "--color-hover": c.hover,
    "--color-pressed": c.pressed,
    "--focus-ring": c.focus,

    "--color-success": c.success,
    "--color-success-soft": c.successSoft,
    "--color-success-fg": c.successFg,
    "--color-warning": c.warning,
    "--color-warning-soft": c.warningSoft,
    "--color-warning-fg": c.warningFg,
    "--color-destructive": c.danger,
    "--color-destructive-soft": c.dangerSoft,
    "--color-destructive-fg": c.dangerFg,
    "--color-info": c.info,
    "--color-info-soft": c.infoSoft,
    "--color-info-fg": c.infoFg,
    "--color-neutral": c.neutral,
    "--color-neutral-soft": c.neutralSoft,

    // The edge. `--ink-lift` is the live offset and defaults to rest, which is
    // the name the shipped stylesheets already animate; `--ink-rest` is the
    // anchor the compensating translate is measured from and must not move.
    "--ink-lift": px(theme.edge.rest),
    "--ink-rest": px(theme.edge.rest),
    "--ink-raised": px(theme.edge.raised),
    "--ink-pressed": px(theme.edge.pressed),
    "--ink-press-compact": px(theme.edgeCompact.pressed),
    "--ink-border-width": px(theme.edge.borderWidth),
    "--ink-hairline-width": px(theme.edge.hairlineWidth),

    // Space and shape
    "--radius-xs": px(theme.radius.xs),
    "--radius-sm": px(theme.radius.sm),
    "--radius-md": px(theme.radius.md),
    "--radius-lg": px(theme.radius.lg),
    "--radius-xl": px(theme.radius.xl),
    "--radius-2xl": px(theme.radius["2xl"]),
    "--radius-pill": px(theme.radius.pill),

    "--tap-min": px(theme.touch.tapMin),
    "--tap-dense": px(theme.touch.tapDense),
    "--row-height-sm": px(theme.rowHeight.sm),
    "--row-height-md": px(theme.rowHeight.md),
    "--row-height-lg": px(theme.rowHeight.lg),
    "--content-max-width": px(theme.measure.content),

    // Motion
    "--dur-fast": `${theme.duration.fast}ms`,
    "--dur-base": `${theme.duration.base}ms`,
    "--dur-lift": `${theme.duration.lift}ms`,
    "--dur-slow": `${theme.duration.slow}ms`,
    // `--ink-ease`, not `--ease-out`. The shipped stylesheet already defines
    // `--ease-out` as cubic-bezier(0.16, 1, 0.3, 1) and uses it for panels and
    // sidebars, while the ink card animates on (0.22, 1, 0.36, 1) written
    // inline. Two curves genuinely exist; overwriting one with the other during
    // adoption would move every transition in the app to fix none of them.
    "--ink-ease": cssBezier(theme.easing),
  };

  for (const [step, value] of Object.entries(theme.space)) {
    if (step === "0") continue;
    vars[`--space-${step}`] = px(value);
  }

  return vars;
}

/** The same thing as a stylesheet, for a build step or a `<style>` tag. */
export function cssBlock(theme: InkTheme, selector = ":root"): string {
  const body = Object.entries(cssVariables(theme))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}
