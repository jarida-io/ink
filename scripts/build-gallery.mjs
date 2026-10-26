/**
 * Build the component gallery from the real build output.
 *
 * The previous version of this page hand-copied the stylesheet and re-typed the
 * token values, which meant it started rotting the moment either moved. This
 * reads `dist/` — the same files a consumer installs — so the page can only
 * ever show what the library actually ships.
 *
 *   npm run build && node scripts/build-gallery.mjs <out.html>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const { createTheme, cssVariables } = await import(resolve(ROOT, "dist/index.js"));
const { monthGrid, weekdayOrder } = await import(resolve(ROOT, "dist/headless/calendar.js"));

const css = readFileSync(resolve(ROOT, "dist/css/ink.css"), "utf8");
const light = cssVariables(createTheme());
const dark = cssVariables(createTheme({ scheme: "dark" }));
const out = process.argv[2] ?? resolve(ROOT, "gallery.html");

const block = (vars) =>
  Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

// ── Icons ──────────────────────────────────────────────────────────────────
//
// The gallery draws icons the same way the library does: from node data, on a
// 24 grid, with the stroke compensated so every size carries the same weight.
// `lucide-static` is a devDependency and pure data — no renderer, no React —
// which is exactly the form the library consumes, so what is on this page is
// what a consumer gets rather than a hand-tuned imitation.
const ICON_NODES = JSON.parse(
  readFileSync(resolve(ROOT, "node_modules/lucide-static/icon-nodes.json"), "utf8"),
);

function icon(name, size = 20) {
  const node = ICON_NODES[name];
  if (!node) throw new Error(`gallery: no icon named "${name}"`);
  const body = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
      return `<${tag} ${a} />`;
    })
    .join("");
  // The same compensation `iconStrokeWidth` performs: desired * 24 / rendered.
  const stroke = ((2 * 24) / size).toFixed(3);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tone-fg, currentColor)" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

// ── The calendar, rendered from the real grid ──────────────────────────────
const DAY2 = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const weeks = monthGrid(2026, 1, {
  today: { year: 2026, month: 1, day: 9 },
  selected: { year: 2026, month: 1, day: 14 },
  range: { start: { year: 2026, month: 1, day: 20 }, end: { year: 2026, month: 1, day: 24 } },
});
const calendar = `
<div class="ink-calendar">
  <div class="ink-calendar__head">
    <button class="ink-calendar__page" aria-label="Previous month">${icon("chevron-left")}</button>
    <span class="ink-calendar__month">January 2026</span>
    <button class="ink-calendar__page" aria-label="Next month">${icon("chevron-right")}</button>
  </div>
  <div class="ink-calendar__grid" role="grid" aria-label="January 2026">
    <div class="ink-calendar__row" role="row">${weekdayOrder(1)
      .map((i) => `<span class="ink-calendar__weekday" role="columnheader">${DAY2[i]}</span>`)
      .join("")}</div>
    ${weeks
      .map(
        (week) =>
          `<div class="ink-calendar__row" role="row">${week
            .map((c) => {
              const a = [];
              if (!c.inMonth) a.push("data-outside");
              if (c.isToday) a.push("data-today");
              if (c.selected) a.push("data-selected");
              if (c.inRange) a.push("data-in-range");
              if (c.rangeStart) a.push("data-range-start");
              if (c.rangeEnd) a.push("data-range-end");
              return `<button class="ink-calendar__day" role="gridcell" tabindex="-1" ${a.join(" ")}>${c.date.day}</button>`;
            })
            .join("")}</div>`,
      )
      .join("")}
  </div>
</div>`;

// Counted from the built entry point rather than typed, so it cannot go stale
// the way "16 components" did on the first version of this page.

const { HOUSE_ICONS } = await import(resolve(ROOT, "dist/core/house-icons.js"));
const HOUSE_NAMES = Object.keys(HOUSE_ICONS);

const WALL = [
  "house", "user", "users", "settings", "bell", "mail", "calendar", "clock",
  "file-text", "folder", "image", "video", "mic", "volume-2", "headphones", "music",
  "heart", "bookmark", "flag", "tag", "pin", "map", "compass", "globe",
  "download", "upload", "share-2", "link", "paperclip", "printer", "save", "trash-2",
  "pencil", "copy", "scissors", "clipboard", "funnel", "list", "grid-2x2", "layers",
  "lock", "lock-open", "key", "shield", "eye", "eye-off", "wifi", "battery",
  "sun", "moon", "cloud", "droplet", "flame", "leaf", "star", "sparkles",
  "play", "pause", "skip-forward", "repeat", "shuffle", "rewind",
  "credit-card", "shopping-cart", "gift", "package", "truck", "store",
  "code", "terminal", "database", "server", "cpu", "git-branch",
];

const reactEntry = readFileSync(resolve(ROOT, "src/react/index.ts"), "utf8");
const componentCount = new Set(
  [...reactEntry.matchAll(/^export\s+\{([^}]+)\}/gm)]
    .flatMap((m) => m[1].split(","))
    .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
    .filter((n) => n.startsWith("Ink")),
).size;

const html = `<meta charset="utf-8">
<title>Ink Components</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap">

<style>
/* ═══════════════════════════════════════════════════════════════════════════
   Generated by scripts/build-gallery.mjs from dist/. Both the stylesheet and
   the token values below are the real build output, so this page cannot show
   something the library does not ship.
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
${block(light)}
}

/* The viewer's theme has three states: an explicit choice stamps data-theme,
   and the default "system" setting stamps nothing — so the media query is
   guarded to lose against an explicit light choice, and the attribute rule
   repeats the palette so the toggle wins in both directions. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block(dark)}
  }
}
:root[data-theme="dark"] {
${block(dark)}
}

${css}

/* ── The page itself ───────────────────────────────────────────────────── */

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: var(--leading-base);
  -webkit-font-smoothing: antialiased;
}

.wrap { max-width: 1080px; margin: 0 auto; padding: var(--space-10) var(--space-6) var(--space-16); }

.masthead { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-12); }
.masthead h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(38px, 7vw, 60px);
  font-weight: var(--weight-bold);
  font-style: italic;
  letter-spacing: -0.03em;
  line-height: 1.05;
}
.lede { margin: 0; max-width: 58ch; font-size: var(--text-lg); line-height: 1.5; }
.meta { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }

section { display: flex; flex-direction: column; gap: var(--space-5); margin-top: var(--space-12); scroll-margin-top: 90px; }
section > h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 30px);
  font-weight: var(--weight-bold);
  font-style: italic;
  letter-spacing: -0.02em;
}
.sec-note { margin: 0; max-width: 68ch; color: var(--color-text-secondary); font-size: var(--text-base); }

/* A specimen: the live thing on the left, the reason for it on the right. */
.spec {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 300px);
  gap: var(--space-6);
  align-items: start;
  padding: var(--pad-lg);
  border: var(--ink-hairline-width) solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-content);
}
.spec > .demo { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.spec > .note { display: flex; flex-direction: column; gap: var(--space-2); }
.spec > .note p { margin: 0; font-size: var(--text-sm); line-height: 1.55; color: var(--color-text-secondary); }
.spec > .note code { font-size: 0.9em; }

@media (max-width: 760px) { .spec { grid-template-columns: minmax(0, 1fr); } }

/* The demo frame holds a fixed-width sidebar beside a flexible body, which is
   wider than a phone. On a narrow screen it scrolls inside itself rather than
   taking the page sideways with it — the same rule the components follow. */
@media (max-width: 620px) {
  .frame { overflow-x: auto; }
  .frame > * { flex-shrink: 0; }
  .frame__body { min-width: 260px; }
}

.row { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-start; }
.rowc { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
.col { display: flex; flex-direction: column; gap: var(--space-3); }

code {
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--bg-brand-soft);
  color: var(--border-ink);
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.frame {
  display: flex;
  min-height: 300px;
  border: var(--ink-hairline-width) solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background:
    linear-gradient(120deg, #7C3AED, #0D9488 42%, #F97316 72%, #2A0C66);
}
.frame__body { flex: 1; padding: var(--space-4); display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-4); }

:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }

/* The page's own bar, so the material is demonstrated rather than described. */
.topbar { position: sticky; top: 0; z-index: 60; display: flex; justify-content: flex-end; padding: var(--space-3) 0; }
.themeToggle {
  display: inline-flex; align-items: center; gap: var(--ctl-gap-sm);
  min-height: var(--ctl-h-sm); padding: 0 var(--ctl-px-sm);
  border: var(--ink-hairline-width) solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface); color: var(--color-text);
  font: inherit; font-size: var(--text-sm); font-weight: var(--weight-semibold);
  cursor: pointer;
}
.themeToggle:hover { border-color: var(--color-text); }

@media (prefers-reduced-motion: reduce) { * { animation-duration: 1ms !important; } }

/* ── Icons ──────────────────────────────────────────────────────────────── */
.iconPanel {
  flex: 1 1 320px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--pad-lg);
  border: var(--ink-hairline-width) solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-content);
}
.iconDemo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
.iconWall {
  display: grid;
  /* Follows the column rather than a fixed count, so the wall reflows to a
     phone instead of scrolling sideways. */
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: var(--space-2);
}
.iconWall figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}
.iconWall figure:hover { background: var(--color-surface); color: var(--color-text); }
.iconWall figcaption {
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
  color: var(--color-text-secondary);
}
.sizeLadder {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: flex-end;
}
.sizeLadder > span {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.sizeLadder em {
  font-family: var(--font-mono);
  font-size: 10px;
  font-style: normal;
  color: var(--color-text-secondary);
}
.sizeLadder[data-uncompensated] { opacity: 0.75; }
/* What the library renders for a name that did not resolve. */
.iconGap {
  display: inline-block;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px var(--color-destructive, #b3261e);
}
.iconWarn {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-x: auto;
}
</style>

<div class="wrap">
  <div class="topbar">
    <button class="themeToggle" id="theme" type="button">
      <span class="ink-nav__icon" aria-hidden="true">◐</span><span id="themeLabel">Dark</span>
    </button>
  </div>

  <header class="masthead">
    <span class="ink-eyebrow">Ink &middot; component gallery</span>
    <h1>Every part, in&nbsp;its own&nbsp;CSS</h1>
    <p class="lede">Nothing here is a screenshot. The stylesheet and the token values are read straight out of <code>dist/</code>, so this page can only show what the library actually ships.</p>
    <div class="meta">
      <span class="ink-badge" style="--ink-tone-fg: var(--border-ink); --ink-tone-soft: var(--bg-brand-soft)">${componentCount} components</span>
      <span class="ink-badge" style="--ink-tone-fg: var(--color-text-secondary); --ink-tone-soft: var(--color-neutral-soft)">React</span>
      <span class="ink-badge" style="--ink-tone-fg: var(--color-text-secondary); --ink-tone-soft: var(--color-neutral-soft)">React Native</span>
      <span class="ink-badge" style="--ink-tone-fg: var(--color-text-secondary); --ink-tone-soft: var(--color-neutral-soft)">zero dependencies</span>
    </div>
  </header>

  <!-- ── Navigation ─────────────────────────────────────────────────────── -->
  <section id="navigation">
    <h2>Navigation</h2>
    <p class="sec-note">A sidebar, a rail and a bottom bar are one list of destinations at three widths &mdash; one component underneath, so a badge or a selected state is defined once. All three wear the same glass as the navbar and run the same state machine.</p>

    <div class="spec">
      <div class="demo">
        <div class="frame">
          <nav class="ink-glass ink-glass--vertical ink-glass--raised ink-sidebar ink-sidebar--floating" aria-label="Main" id="side">
            <div class="ink-sidebar__head"><strong>Ink</strong></div>
            <div class="ink-sidebar__body">
              <div class="ink-sidebar__section">
                <span class="ink-eyebrow ink-sidebar__sectionLabel">Library</span>
                <button class="ink-nav__item ink-nav__item--row" aria-current="page"><span class="ink-nav__icon">${icon("layers")}</span><span class="ink-nav__label">Everything</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item ink-nav__item--row"><span class="ink-nav__icon">${icon("clock")}</span><span class="ink-nav__label">Recent</span><span class="ink-nav__badge">3</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item ink-nav__item--row"><span class="ink-nav__icon">${icon("users")}</span><span class="ink-nav__label">Shared</span><span class="ink-nav__mark"></span></button>
              </div>
            </div>
            <div class="ink-sidebar__foot"><span class="ink-eyebrow">v1.0</span></div>
            <button class="ink-sidebar__toggle" id="railToggle" aria-label="Collapse navigation"><span class="ink-sidebar__chev"></span></button>
          </nav>

          <div class="frame__body">
            <header class="ink-glass ink-glass--raised ink-navbar ink-navbar--floating" id="nav" data-stage="condensed" data-material="true" style="position:static;margin:0">
              <div class="ink-navbar__body" id="navBody">
                <h1 class="ink-navbar__title">Library</h1>
                <div class="ink-navbar__spacer"></div>
                <button class="ink-navbar__action">Search</button>
                <button class="ink-navbar__action">New</button>
              </div>
              <button class="ink-navbar__puck" id="navPuck" tabindex="-1" aria-label="Show navigation"><span class="ink-navbar__puckMark"></span></button>
            </header>

            <nav class="ink-glass ink-glass--raised ink-bottombar ink-bottombar--floating" aria-label="Sections" id="bot" data-stage="condensed" data-material="true" style="position:static;margin:0">
              <div class="ink-bottombar__body" id="botBody">
                <button class="ink-nav__item" aria-current="page"><span class="ink-nav__icon">${icon("house")}</span><span class="ink-nav__label">Home</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item"><span class="ink-nav__icon">${icon("inbox")}</span><span class="ink-nav__label">Inbox</span><span class="ink-nav__badge">12</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item"><span class="ink-nav__icon">${icon("search")}</span><span class="ink-nav__label">Search</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item"><span class="ink-nav__icon"><span class="ink-nav__more"></span></span><span class="ink-nav__label">More</span><span class="ink-nav__mark"></span></button>
              </div>
              <button class="ink-bottombar__puck" id="botPuck" tabindex="-1" aria-label="Show navigation">${icon("house")}</button>
            </nav>
          </div>
        </div>
        <div class="rowc">
          <button class="ink-btn ink-btn--quiet" id="stagePrev" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">&larr; expand</button>
          <span class="ink-eyebrow" id="stageOut">stage: condensed</span>
          <button class="ink-btn ink-btn--quiet" id="stageNext" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">collapse &rarr;</button>
          <button class="ink-btn ink-btn--quiet" id="railBtn" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">toggle rail</button>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkSidebar &middot; InkNavbar &middot; InkBottomBar</span>
        <p>Press <em>collapse</em>: both bars contract to a single button. Pressing that button <strong>restores the bar</strong> &mdash; it does not fire the action underneath, because the reader collapsed it by scrolling rather than by choosing to.</p>
        <p>The material only arrives once content is under it. An always-on bar spends contrast before it has anything to separate.</p>
        <p>The glass runs down the sidebar&rsquo;s inner edge and along the bars&rsquo; top &mdash; a vertical surface catches light differently.</p>
        <p>A bottom bar caps at five and turns the last slot into overflow rather than squeezing.</p>
      </div>
    </div>

    <div class="spec">
      <div class="demo">
        <div class="ink-tabs" role="tablist" aria-label="View">
          <button class="ink-tabs__tab" role="tab" aria-selected="true">Remembered<span class="ink-tabs__badge">4</span></button>
          <button class="ink-tabs__tab" role="tab" aria-selected="false">Collected</button>
          <button class="ink-tabs__tab" role="tab" aria-selected="false">Sources</button>
          <button class="ink-tabs__tab" role="tab" aria-selected="false" disabled>Lineage</button>
        </div>
        <nav class="ink-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><button class="ink-breadcrumb__link">Home</button></li>
            <li><span class="ink-breadcrumb__gap" aria-label="Skipped levels">&hellip;</span></li>
            <li><button class="ink-breadcrumb__link">Voice</button></li>
            <li><span aria-current="page">Quality</span></li>
          </ol>
        </nav>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkTabs &middot; InkBreadcrumb</span>
        <p>Tabs are for <em>views</em>; a segmented control is for <em>values</em>. Not pedantry &mdash; a tab changes what you are looking at and belongs in the URL.</p>
        <p>One tab stop for the group, arrows inside it. Eleven tab stops is a group nobody reaches the end of.</p>
        <p>The breadcrumb truncates from the middle: the ends are the parts that mean anything.</p>
      </div>
    </div>
  </section>

  <!-- ── The edge ───────────────────────────────────────────────────────── -->
  <section id="icons">
    <h2>Icons</h2>
    <p class="lede">
      Name an icon in plain text and it draws — the same string on the web and on
      device. <code>Search</code>, <code>SearchIcon</code>, <code>LucideSearch</code>
      and <code>search</code> are one name. Eighteen ship built in; the rest arrive
      from whichever icon package your platform actually has.
    </p>

    <div class="row">
      <div class="iconPanel">
        <span class="ink-eyebrow">One name, every component</span>
        <p class="ink-prose">Nothing below sets a size or a colour. Each component asks for
        the size its own geometry derives, and the icon takes the colour of the text
        or the tone of the container it lands in.</p>
        <div class="iconDemo">
          <button class="ink-btn ink-btn--primary">${icon("search")}Search</button>
          <button class="ink-btn ink-btn--quiet">${icon("download")}Export</button>
          <button class="ink-btn ink-btn--quiet" aria-label="Settings">${icon("settings")}</button>
          <span class="ink-chip" data-selected><span class="ink-chip__press"><span class="ink-chip__icon">${icon("check", 16)}</span><span class="ink-chip__label">Selected</span></span></span>
          <span class="ink-chip"><span class="ink-chip__press"><span class="ink-chip__icon">${icon("funnel", 16)}</span><span class="ink-chip__label">Filtered</span></span></span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-success-fg); --ink-tone-soft: var(--color-success-soft)">${icon("check", 16)}Ready</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-destructive-fg); --ink-tone-soft: var(--color-destructive-soft)">${icon("triangle-alert", 16)}Failed</span>
        </div>
        <div class="iconDemo">
          <p class="ink-notice" role="status" style="--ink-tone-fg: var(--color-success-fg); --ink-tone-soft: var(--color-success-soft)">${icon("check")}Saved to this device.</p>
          <p class="ink-notice" role="alert" style="--ink-tone-fg: var(--color-destructive-fg); --ink-tone-soft: var(--color-destructive-soft)">${icon("triangle-alert")}That name is already taken.</p>
        </div>
        <p class="ink-prose" style="margin-top:var(--space-4)">The two notices are the
        same markup with a different tone. The icons follow, because a stroke reading
        <code>var(--ink-tone-fg, currentColor)</code> is red in one and green in the
        other without anyone passing a colour.</p>
      </div>

      <div class="iconPanel">
        <span class="ink-eyebrow">In a list, a menu, a rail</span>
        <div class="ink-list" role="list" aria-label="Files">
          <button class="ink-listitem ink-listitem--pressable" role="listitem" data-selected>
            <span class="ink-listitem__lead">${icon("file-text", 24)}</span>
            <span class="ink-listitem__text"><span class="ink-listitem__title">Quarterly notes</span><span class="ink-listitem__desc">Edited 2 hours ago</span></span>
            <span class="ink-listitem__trail">${icon("chevron-right", 20)}</span>
          </button>
          <button class="ink-listitem ink-listitem--pressable" role="listitem">
            <span class="ink-listitem__lead">${icon("image", 24)}</span>
            <span class="ink-listitem__text"><span class="ink-listitem__title">Cover photo</span><span class="ink-listitem__desc">2.4 MB</span></span>
            <span class="ink-listitem__trail">${icon("chevron-right", 20)}</span>
          </button>
          <button class="ink-listitem ink-listitem--pressable" role="listitem">
            <span class="ink-listitem__lead">${icon("music", 24)}</span>
            <span class="ink-listitem__text"><span class="ink-listitem__title">Interview take 3</span><span class="ink-listitem__desc">18 minutes</span></span>
            <span class="ink-listitem__trail">${icon("chevron-right", 20)}</span>
          </button>
        </div>
        <div class="frame" style="margin-top:var(--space-4)"><div class="ink-menu">
          <button class="ink-menu__item" role="menuitem">${icon("pencil")}Rename</button>
          <button class="ink-menu__item" role="menuitem">${icon("copy")}Duplicate</button>
          <button class="ink-menu__item" role="menuitem">${icon("share-2")}Share</button>
          <button class="ink-menu__item" role="menuitem">${icon("trash-2")}Delete</button>
        </div></div>
      </div>
    </div>

    <div class="row">
      <div class="iconPanel">
        <span class="ink-eyebrow">One weight at every size</span>
        <p class="ink-prose">Icon size is derived from the control's height —
        <code>round(height &times; 0.45)</code> on the 4px grid — so 32, 44 and 52 give
        16, 20 and 24. <strong>52 lands on 24 deliberately</strong>: that is the grid the
        artwork is drawn on, and the one size where it is untouched.</p>
        <div class="sizeLadder">
          <span>${icon("bell", 16)}<em>16 &middot; sm</em></span>
          <span>${icon("bell", 20)}<em>20 &middot; md</em></span>
          <span>${icon("bell", 24)}<em>24 &middot; lg</em></span>
          <span>${icon("bell", 32)}<em>32</em></span>
          <span>${icon("bell", 48)}<em>48</em></span>
        </div>
        <p class="ink-prose" style="margin-top:var(--space-4)">Every bell above carries a
        two-pixel line. Scaling a 24px drawing down would have thinned it to 1.33px at
        16 — beside a 24px icon that reads as two different font weights, which is the
        defect this compensation exists to prevent.</p>
        <div class="sizeLadder" data-uncompensated>
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_NODES["bell"].map(([t, a]) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")} />`).join("")}</svg><em>16 uncompensated</em></span>
          <span><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_NODES["bell"].map(([t, a]) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")} />`).join("")}</svg><em>48 uncompensated</em></span>
        </div>
        <p class="ink-prose">The pair above is what the library does <em>not</em> do: the
        same glyph, stroke left alone, hairline at 16 and heavy at 48.</p>
      </div>

      <div class="iconPanel">
        <span class="ink-eyebrow">The house set &mdash; ${HOUSE_NAMES.length} names, nothing installed</span>
        <p class="ink-prose">These resolve on a fresh install with no icon package and no
        registration. They are the glyphs the library needs for its own chrome, and they
        are drawn on the same grid as everything else so a mixture never shows.</p>
        <div class="iconWall">
          ${HOUSE_NAMES.map((n) => `<figure>${icon(n, 24)}<figcaption>${n}</figcaption></figure>`).join("")}
        </div>
      </div>
    </div>

    <div class="iconPanel">
      <span class="ink-eyebrow">Anything you register</span>
      <p class="ink-prose">Below is a sample of a registered lucide set, drawn by Ink from
      lucide's own geometry. Register the icons you use rather than the whole package:
      a named object of 40 icons costs 3.9&nbsp;KB gzipped, where handing over the entire
      <code>icons</code> namespace costs 133.8&nbsp;KB, because a bundler cannot shake a
      set it has to index by a variable.</p>
      <div class="iconWall">
        ${WALL.map((n) => `<figure>${icon(n, 24)}<figcaption>${n}</figcaption></figure>`).join("")}
      </div>
    </div>

    <div class="iconPanel">
      <span class="ink-eyebrow">When the name is wrong</span>
      <p class="ink-prose">A name that does not resolve reserves exactly the space the icon
      would have taken, so correcting the spelling never reflows the row around it. In
      development it also outlines that space, because a console warning scrolls away and
      a red box does not. It never renders the name as text &mdash; a raw word shipped
      into production UI reads as finished work.</p>
      <div class="iconDemo">
        <button class="ink-btn ink-btn--quiet">${icon("search")}Correct</button>
        <button class="ink-btn ink-btn--quiet"><span class="iconGap" data-ink-icon-missing="serach"></span>Misspelled</button>
      </div>
      <pre class="iconWarn"><code>ink: no icon named "serach". Did you mean "search"?</code></pre>
    </div>
  </section>

  <section id="surfaces">
    <h2>Surfaces</h2>
    <p class="sec-note">The edge is a 2px border printed 4px above a hard plate. Hover lifts it, pressing drives it down into the plate and lands the face where the plate was. The plate never moves &mdash; which is what makes it drawable in two views on React Native.</p>

    <div class="spec">
      <div class="demo row">
        <button class="ink-edge ink-card ink-pressable" style="width:260px">
          <span class="ink-eyebrow">Yesterday &middot; 14:20</span>
          <strong>Which of these plants wants less water</strong>
          <span class="ink-prose">22 turns &middot; ended by you</span>
        </button>
        <div class="ink-edge ink-group" style="width:300px">
          <header class="ink-group__head">
            <h2 class="ink-group__title">Speaking</h2>
            <span class="ink-badge" style="--ink-tone-fg: var(--color-text-secondary); --ink-tone-soft: var(--color-neutral-soft)">3</span>
          </header>
          <div class="ink-group__body">
            <div class="ink-row"><div class="ink-row__text"><span class="ink-row__label">Voice</span><span class="ink-row__desc">Who it sounds like</span></div><div class="ink-row__control"><button class="ink-btn ink-btn--quiet" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">Bella</button></div></div>
            <div class="ink-row"><div class="ink-row__text"><span class="ink-row__label">Speak aloud</span><span class="ink-row__desc">Off keeps it silent</span></div><div class="ink-row__control"><button class="ink-switch" role="switch" aria-checked="true" aria-label="Speak aloud"><span class="ink-switch__knob"></span></button></div></div>
          </div>
        </div>
        <div class="ink-stage" style="width:240px">
          <span class="ink-eyebrow">Bella, grade A</span>
          <p style="margin:0;text-align:center;font-weight:var(--weight-semibold)">A sample of this voice.</p>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkCard &middot; InkGroup &middot; InkRow &middot; InkStage</span>
        <p>Hover the card, then press it. The lift is the whole affordance, which is why reduced motion collapses the transition rather than removing it.</p>
        <p>One card holding rows, not one card per row. Fourteen ink cards in a grid is the loudest treatment in the system used as wallpaper.</p>
        <p>The stage is a quiet inset with no plate &mdash; a raised box inside a raised box is the third copy of a signal that only works while it is rare.</p>
      </div>
    </div>
  </section>

  <!-- ── Controls ───────────────────────────────────────────────────────── -->
  <section id="controls">
    <h2>Controls</h2>
    <p class="sec-note">State is elevation, not hue. A chosen thing rises on its offset; everything unchosen lies flat with a hairline. There is no <code>color</code> prop on any component &mdash; colour comes from six named tones, so you name the meaning before you get the hue.</p>

    <div class="spec">
      <div class="demo">
        <div class="ink-segmented" role="radiogroup" aria-label="Voice" id="voices">
          <button class="ink-choice ink-choice--tile" role="radio" aria-checked="false" tabindex="-1"><span class="ink-choice__name">Heart</span><span class="ink-choice__meta">Grade A</span></button>
          <button class="ink-choice ink-choice--tile" role="radio" aria-checked="true" tabindex="0"><span class="ink-choice__name">Bella</span><span class="ink-choice__meta">Grade A</span></button>
          <button class="ink-choice ink-choice--tile" role="radio" aria-checked="false" tabindex="-1"><span class="ink-choice__name">Nicole</span><span class="ink-choice__meta">Grade B</span></button>
          <button class="ink-choice ink-choice--tile" role="radio" aria-checked="false" tabindex="-1"><span class="ink-choice__name">Michael</span><span class="ink-choice__meta">Grade C</span></button>
        </div>
        <div class="ink-segmented" role="radiogroup" aria-label="Accent" id="accents">
          <button class="ink-choice ink-choice--pill" role="radio" aria-checked="true" tabindex="0"><span class="ink-choice__name">American</span></button>
          <button class="ink-choice ink-choice--pill" role="radio" aria-checked="false" tabindex="-1"><span class="ink-choice__name">British</span></button>
        </div>
        <div class="rowc">
          <button class="ink-btn ink-btn--primary">Hear this voice</button>
          <button class="ink-btn ink-btn--quiet">Cancel</button>
          <button class="ink-btn ink-btn--danger">Delete</button>
        </div>
        <div class="rowc">
          <button class="ink-btn ink-btn--primary ink-btn--sm ink-reach">${icon("plus", 16)}Small</button>
          <button class="ink-btn ink-btn--quiet ink-btn--sm ink-reach">${icon("pencil", 16)}Small</button>
          <button class="ink-btn ink-btn--primary">${icon("refresh-cw")}Medium</button>
          <button class="ink-btn ink-btn--primary ink-btn--lg">${icon("download", 24)}Large</button>
        </div>
        <div class="rowc">
          <button class="ink-btn ink-btn--primary" disabled aria-busy="true" data-loading><span class="ink-spinner" aria-hidden="true" style="width:18px;height:18px"></span>Saving</button>
          <button class="ink-btn ink-btn--quiet" disabled aria-busy="true" data-loading><span class="ink-spinner" aria-hidden="true" style="width:18px;height:18px"></span>Checking</button>
          <button class="ink-btn ink-btn--danger">${icon("trash-2")}Remove</button>
          <button class="ink-btn ink-btn--primary" disabled>Disabled</button>
          <button class="ink-btn ink-btn--quiet" disabled>Disabled</button>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkChoice &middot; InkSegmented &middot; InkButton &middot; InkSwitch</span>
        <p>Arrow keys move inside each group. Selection follows focus, and the group is one tab stop.</p>
        <p>No selected-colour, no tint, no check mark doing the edge&rsquo;s job. Colour is the page&rsquo;s scarcest material and spending it on <em>this one</em> leaves nothing for the control that is asking a question.</p>
        <p>A screen gets about one <code>primary</code>. <code>danger</code> is a primary that happens to be destructive, not a third emphasis level.</p>
        <p>Every variant&rsquo;s face is the control height, so a quiet Cancel lines up with a primary Save. <code>loading</code> keeps the words &mdash; a button that swaps its label for a spinner has stopped saying what it is doing.</p>
      </div>
    </div>

    <div class="spec">
      <div class="demo row">
        <div class="col" style="min-width:300px;flex:1">
          <div class="ink-radios" role="radiogroup" aria-label="Quality" id="quality">
            <button class="ink-radio" role="radio" aria-checked="true" tabindex="0"><span class="ink-radio__dot"></span><span class="ink-radio__text"><span class="ink-radio__label">Balanced</span><span class="ink-radio__desc">154 MB. Sounds good and downloads quickly.</span></span></button>
            <button class="ink-radio" role="radio" aria-checked="false" tabindex="-1"><span class="ink-radio__dot"></span><span class="ink-radio__text"><span class="ink-radio__label">Best</span><span class="ink-radio__desc">326 MB. Noticeably better on a good speaker.</span></span></button>
          </div>
          <div class="col" style="gap:var(--space-1)">
            <label class="ink-labelled"><button class="ink-checkbox" data-state="on" role="checkbox" aria-checked="true" aria-label="Kitchen speaker"><span class="ink-checkbox__icon">${icon("check", 16)}</span></button><span class="ink-labelled__text">Kitchen speaker</span></label>
            <label class="ink-labelled"><button class="ink-checkbox" data-state="mixed" role="checkbox" aria-checked="mixed" aria-label="Some rooms"><span class="ink-checkbox__icon">${icon("minus", 16)}</span></button><span class="ink-labelled__text">Some rooms</span></label>
            <label class="ink-labelled"><button class="ink-checkbox" data-state="off" role="checkbox" aria-checked="false" aria-label="Garage"></button><span class="ink-labelled__text">Garage</span></label>
            <label class="ink-labelled"><button class="ink-switch" role="switch" aria-checked="true" aria-label="Speak aloud"><span class="ink-switch__knob"></span></button><span class="ink-labelled__text">Speak aloud</span></label>
            <label class="ink-labelled" data-disabled><button class="ink-switch" role="switch" aria-checked="false" aria-label="Keep forever" disabled><span class="ink-switch__knob"></span></button><span class="ink-labelled__text">Keep forever</span></label>
          </div>
        </div>
        <div class="col" style="min-width:280px;flex:1">
          <span class="ink-eyebrow">Pace</span>
          <input class="ink-slider" type="range" min="50" max="200" value="120" aria-label="Pace" style="--ink-fill: 0.4667">
          <span class="ink-eyebrow">Price</span>
          <div class="ink-range">
            <div class="ink-range__track"><span class="ink-range__fill" style="left:20%;right:28%"></span></div>
            <input class="ink-range__input" type="range" min="0" max="100" value="20" aria-label="Price, lower bound">
            <input class="ink-range__input" type="range" min="0" max="100" value="72" aria-label="Price, upper bound">
          </div>
          <span class="ink-eyebrow">Room</span>
          <span class="ink-select" data-empty><select aria-label="Room"><option value="" disabled selected>Pick a room</option><option>Kitchen</option><option>Living room</option></select><span class="ink-select__mark" aria-hidden="true">${icon("chevron-down", 18)}</span></span>
          <div class="ink-menu" id="menu">
            <button class="ink-btn ink-btn--quiet ink-btn--sm ink-reach" id="menuTrigger" aria-haspopup="menu" aria-expanded="false">${icon("ellipsis", 16)}Actions</button>
            <div class="ink-menu__list" role="menu" aria-label="Actions" data-align="start" id="menuList" hidden>
              <button class="ink-menu__item" role="menuitem">${icon("pencil")}Rename</button>
              <button class="ink-menu__item" role="menuitem">${icon("copy")}Duplicate</button>
              <button class="ink-menu__item" role="menuitem" data-tone="danger" data-separated>${icon("trash-2")}Delete</button>
            </div>
          </div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkRadioGroup &middot; InkCheckbox &middot; InkSlider &middot; InkRangeSlider &middot; InkMenu</span>
        <p>A radio group is for choices that need <strong>explaining</strong>; a segment is for values that fit on a line. Wanting a description on a segment means you wanted a radio group.</p>
        <p>A checkbox has a third state a switch cannot have. A switch applies on flip; a checkbox is submitted with a form.</p>
        <p>The range slider is two native inputs on one track, so the whole platform keyboard comes free. The ends clamp rather than swapping.</p>
        <p>A menu is for <em>actions</em>. For picking a value, the platform&rsquo;s own picker is better at every part of it.</p>
      </div>
    </div>
  </section>

  <!-- ── Dates ──────────────────────────────────────────────────────────── -->
  <section id="dates">
    <h2>Dates &amp; time</h2>
    <p class="sec-note">Civil dates &mdash; a year, a month and a day, with no timezone and no clock. Every calendar bug I have had to fix came from day arithmetic on a timestamp: <code>d + 1</code> is &ldquo;86,400,000ms later&rdquo;, and twice a year those are different days.</p>

    <div class="spec">
      <div class="demo row">
        ${calendar}
        <div class="col" style="min-width:240px">
          <span class="ink-eyebrow">Date field</span>
          <div class="ink-picker"><button class="ink-picker__field"><span class="ink-picker__value">Wednesday 14 January 2026</span><span class="ink-picker__mark"></span></button></div>
          <span class="ink-eyebrow">Empty</span>
          <div class="ink-picker"><button class="ink-picker__field"><span class="ink-picker__value ink-picker__value--empty">Pick a date</span><span class="ink-picker__mark"></span></button></div>
          <span class="ink-eyebrow">Range</span>
          <div class="ink-picker"><button class="ink-picker__field"><span class="ink-picker__value">20/1/2026 &ndash; 24/1/2026</span><span class="ink-picker__mark"></span></button></div>
          <span class="ink-eyebrow">Time</span>
          <span class="ink-select"><select aria-label="At"><option>09:00</option><option>09:15</option><option>09:30</option></select><span class="ink-select__mark" aria-hidden="true">${icon("chevron-down", 18)}</span></span>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkCalendar &middot; InkDatePicker &middot; InkDateRangePicker &middot; InkTimePicker</span>
        <p>Rendered from the real <code>monthGrid</code>. Always six weeks, so nothing under it jumps as you page.</p>
        <p><strong>Today</strong> is a ring, not a fill &mdash; a fill would be indistinguishable from the selection, and on the day you open the calendar those are different things.</p>
        <p>The middle of a range has square corners so it reads as continuous rather than as a row of separate selections.</p>
        <p>A field opens a calendar rather than hoping for a typed format. 03/04 is two different days on two sides of an ocean.</p>
      </div>
    </div>
  </section>

  <!-- ── Chat ───────────────────────────────────────────────────────────── -->
  <section id="chat">
    <h2>Chat</h2>
    <p class="sec-note">The tail belongs to the <em>run</em>, not to every message. A run of four messages from one person is one utterance interrupted by line breaks; four tails reads as four interruptions.</p>

    <div class="spec">
      <div class="demo">
        <div class="ink-bubbles" role="log" aria-label="Conversation">
          <div class="ink-bubble ink-bubble--theirs" data-position="first"><span class="ink-bubble__author">Ada</span><div class="ink-bubble__body">Morning &mdash; did the export finish?</div></div>
          <div class="ink-bubble ink-bubble--theirs" data-position="last"><div class="ink-bubble__body" data-tail="true">I can rerun it if not.</div></div>
          <div class="ink-bubble ink-bubble--mine" data-position="first"><div class="ink-bubble__body">It did</div></div>
          <div class="ink-bubble ink-bubble--mine" data-position="last"><div class="ink-bubble__body" data-tail="true">Took about four minutes, which is faster than last time.</div><span class="ink-bubble__meta">09:14</span></div>
          <div class="ink-bubble ink-bubble--mine" data-position="only" data-status="failed"><div class="ink-bubble__body" data-tail="true">This one did not send</div><span class="ink-bubble__meta"><span class="ink-bubble__failed">Not sent</span></span></div>
          <div class="ink-bubble ink-bubble--theirs" data-position="only"><div class="ink-bubble__body" data-tail="true" aria-hidden="true"><span class="ink-typing"><span></span><span></span><span></span></span></div></div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkBubble &middot; InkBubbleGroup &middot; InkTyping</span>
        <p>Only the last bubble in each run gets a tail, and the group works that out so a caller cannot get it wrong after an insert.</p>
        <p>A failure says so <strong>in words</strong>, not in a colour &mdash; it is the one state where the reader has to act.</p>
        <p>The typing indicator is hidden from assistive technology. Announcing it on every keystroke of someone else&rsquo;s message is the most disruptive thing a chat interface can do.</p>
      </div>
    </div>
  </section>

  <!-- ── Feedback ───────────────────────────────────────────────────────── -->
  <section id="feedback">
    <h2>Feedback</h2>
    <p class="sec-note">Say what happened, not that something did. Every waiting state here has to name what it is waiting for &mdash; <code>InkSpinner</code> will not compile without a label.</p>

    <div class="spec">
      <div class="demo">
        <div class="ink-meter" role="progressbar" aria-label="Fetching Bella" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><span class="ink-meter__fill" style="width:62%"></span></div>
        <div class="rowc">
          <span class="ink-progress"><svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16.5" fill="none" stroke-width="3" class="ink-progress__track"></circle><circle cx="18" cy="18" r="16.5" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="62 104" transform="rotate(-90 18 18)" class="ink-progress__arc"></circle></svg></span>
          <span class="ink-spinner" role="status" aria-label="Loading"></span>
          <span class="ink-dots" role="status" aria-label="Sending"><span></span><span></span><span></span></span>
          <span class="ink-avatar" role="img" aria-label="Jerry Ochieng">JO</span>
          <span class="ink-skeleton" style="width:120px"></span>
        </div>
        <div class="ink-notice" role="status" style="--ink-tone-fg: var(--color-success-fg); --ink-tone-soft: var(--color-success-soft)">${icon("check", 18)}<div class="ink-notice__body"><p class="ink-notice__text">Bella is ready. The engine reloaded and is running q4f16.</p></div></div>
        <div class="ink-notice" role="alert" style="--ink-tone-fg: var(--color-destructive-fg); --ink-tone-soft: var(--color-destructive-soft)">${icon("triangle-alert", 18)}<div class="ink-notice__body"><p class="ink-notice__text">The export could not finish: the destination folder is read-only, so nothing was written.</p><div class="ink-notice__action"><button class="ink-btn ink-btn--quiet ink-btn--sm ink-reach">Try again</button></div></div></div>
        <div class="ink-notice" role="status"><div class="ink-notice__body"><p class="ink-notice__text">A neutral notice, with no icon.</p></div></div>
        <div class="rowc">
          <span class="ink-badge" style="--ink-tone-fg: var(--color-text-secondary); --ink-tone-soft: var(--color-neutral-soft)">neutral</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--border-ink); --ink-tone-soft: var(--bg-brand-soft)">brand</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-success-fg); --ink-tone-soft: var(--color-success-soft)">success</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-warning-fg); --ink-tone-soft: var(--color-warning-soft)">warning</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-destructive-fg); --ink-tone-soft: var(--color-destructive-soft)">danger</span>
          <span class="ink-badge" style="--ink-tone-fg: var(--color-info-fg); --ink-tone-soft: var(--color-info-soft)">info</span>
        </div>
        <div class="ink-empty">
          <span class="ink-empty__icon">${icon("brain", 32)}</span>
          <p class="ink-empty__title">Nothing kept yet</p>
          <p class="ink-prose">Tell it something worth keeping, or connect a calendar under Sources.</p>
          <button class="ink-btn ink-btn--primary">Remember something</button>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkMeter &middot; InkProgress &middot; InkSpinner &middot; InkDots &middot; InkNotice &middot; InkBadge &middot; InkAvatar &middot; InkSkeleton &middot; InkEmptyState</span>
        <p>Omit a meter&rsquo;s value and it paces rather than claiming a percentage it does not have.</p>
        <p>A spinner that cannot say what it is waiting for is claiming progress it has no knowledge of. Prefer a meter when a total is known and a skeleton when the shape is.</p>
        <p>An avatar never derives a colour from the name. A hue per person asserts a grouping the data does not have.</p>
        <p>An empty screen is an invitation to act, which is why the action sits in the API next to the text.</p>
      </div>
    </div>
  </section>

  <!-- ── Data & forms ───────────────────────────────────────────────────── -->
  <section id="data">
    <h2>Data &amp; forms</h2>
    <p class="sec-note">A table sorts through three states &mdash; ascending, descending, and back to the order the rows arrived in. The two-state cycle is more common and is worse: once sorted there is no way back, and the original order is frequently the meaningful one.</p>

    <div class="spec">
      <div class="demo row">
        <form class="ink-form" style="min-width:320px;flex:1">
          <div class="ink-form__summary" role="alert" tabindex="-1">
            <strong>2 things need fixing</strong>
            <ul><li><a href="#f-name">Add a name</a></li><li><a href="#f-email">Check the email address</a></li></ul>
          </div>
          <div class="ink-form__body">
            <div class="ink-formfield" id="f-name">
              <label class="ink-formfield__label" for="c-name">Name<span class="ink-formfield__required"> (required)</span></label>
              <span class="ink-formfield__hint">What people will see.</span>
              <div class="ink-input"><div class="ink-input__box"><input id="c-name" placeholder="Your name"></div></div>
            </div>
            <div class="ink-formfield" id="f-email">
              <label class="ink-formfield__label" for="c-email">Email</label>
              <div class="ink-input ink-input--invalid"><div class="ink-input__box"><input id="c-email" value="not-an-email" aria-invalid="true"></div></div>
              <span class="ink-formfield__error" role="alert">Check the email address</span>
            </div>
            <div class="ink-formfield">
              <label class="ink-formfield__label" for="c-note">Note</label>
              <textarea class="ink-textarea" id="c-note" rows="3">A text area that grows with its content, up to a cap.</textarea>
            </div>
          </div>
          <div class="ink-form__actions">
            <button class="ink-btn ink-btn--quiet" type="button">Cancel</button>
            <button class="ink-btn ink-btn--primary" type="button">Save changes</button>
          </div>
        </form>

        <div class="col" style="min-width:320px;flex:1">
          <div class="ink-table ink-table--sticky" style="max-height:300px">
            <table>
              <caption class="ink-eyebrow">Files</caption>
              <thead><tr>
                <th scope="col" aria-sort="ascending"><button class="ink-table__sort">Name<span class="ink-table__arrow" data-dir="ascending"></span></button></th>
                <th scope="col" data-numeric><button class="ink-table__sort">Size<span class="ink-table__arrow"></span></button></th>
              </tr></thead>
              <tbody>
                <tr><td>archive.tar</td><td data-numeric>1.2 GB</td></tr>
                <tr><td>export.csv</td><td data-numeric>41 MB</td></tr>
                <tr><td>index.db</td><td data-numeric>88 MB</td></tr>
                <tr><td>notes.md</td><td data-numeric>4 KB</td></tr>
                <tr><td>photo.png</td><td data-numeric>2.1 MB</td></tr>
                <tr><td>voices.zip</td><td data-numeric>326 MB</td></tr>
              </tbody>
            </table>
          </div>
          <div class="rowc">
            <span class="ink-divider" style="flex:1"></span>
            <span class="ink-eyebrow">or</span>
            <span class="ink-divider" style="flex:1"></span>
          </div>
          <div class="ink-edge ink-card">
            <span class="ink-eyebrow">Dialog</span>
            <h3 style="margin:0;font-family:var(--font-display);font-size:var(--text-xl);font-weight:var(--weight-bold);font-style:italic;letter-spacing:-0.02em">Delete this conversation?</h3>
            <p class="ink-prose">Twenty-two turns will go with it. This cannot be undone.</p>
            <div class="ink-dialog__actions"><button class="ink-btn ink-btn--quiet">Keep it</button><button class="ink-btn ink-btn--danger">Delete</button></div>
          </div>
          <div class="ink-sheet--bottom" style="position:relative">
            <div class="ink-sheet__panel" style="max-height:none;border-bottom:var(--ink-border-width) solid var(--color-text);border-radius:var(--radius-2xl)">
              <div class="ink-sheet__head">
                <span class="ink-eyebrow">Sheet</span>
                <h3 class="ink-sheet__title">Speaking</h3>
                <p class="ink-sheet__description">How Goose sounds in this room.</p>
              </div>
              <div class="ink-sheet__body">
                <label class="ink-labelled"><button class="ink-switch" role="switch" aria-checked="true" aria-label="Speak aloud"><span class="ink-switch__knob"></span></button><span class="ink-labelled__text">Speak aloud</span></label>
                <button class="ink-btn ink-btn--primary ink-btn--block">Done</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkTable &middot; InkForm &middot; InkFormField &middot; InkInput &middot; InkTextArea &middot; InkDialog &middot; InkDivider</span>
        <p>The header is sticky and the table scrolls in its own container &mdash; one that makes the page scroll sideways takes the whole layout with it.</p>
        <p>Numeric columns are right-aligned and tabular, or the comparison is being made by eye against ragged edges.</p>
        <p>The error summary takes focus when a submit fails and links each message to its field. Without it the reader presses Save, nothing appears to happen, and the reason is above them.</p>
        <p>Required is spelled out. An asterisk is a convention nobody has ever been taught.</p>
      </div>
    </div>
  </section>


  <!-- ── Sidebar ladder ─────────────────────────────────────────────────── -->
  <section id="sidebar">
    <h2>The sidebar ladder</h2>
    <p class="sec-note">Four rungs, not a boolean. <code>rail</code> and <code>button</code> are different answers to the same pressure and get confused constantly: a rail keeps every destination one press away and costs 68px; a button costs nothing and makes every destination two presses.</p>

    <div class="spec">
      <div class="demo">
        <div class="rowc">
          <div class="ink-btngroup ink-btngroup--horizontal" role="group" aria-label="Sidebar size">
            <button class="ink-btn ink-btn--quiet" data-rung="full">full</button>
            <button class="ink-btn ink-btn--quiet" data-rung="rail">rail</button>
            <button class="ink-btn ink-btn--quiet" data-rung="button">button</button>
            <button class="ink-btn ink-btn--quiet" data-rung="hidden">hidden</button>
          </div>
          <button class="ink-btn ink-btn--primary" id="openDrawer" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">Open as drawer</button>
        </div>

        <div class="frame" style="min-height:280px" id="ladderFrame">
          <nav class="ink-glass ink-glass--vertical ink-glass--raised ink-sidebar ink-sidebar--floating" aria-label="Ladder" id="ladder" data-size="full">
            <div class="ink-sidebar__head"><strong>Ink</strong></div>
            <div class="ink-sidebar__body">
              <div class="ink-sidebar__section">
                <span class="ink-eyebrow ink-sidebar__sectionLabel">Library</span>
                <button class="ink-nav__item ink-nav__item--row" aria-current="page"><span class="ink-nav__icon">${icon("layers")}</span><span class="ink-nav__label">Everything</span><span class="ink-nav__mark"></span></button>
                <button class="ink-nav__item ink-nav__item--row"><span class="ink-nav__icon">${icon("clock")}</span><span class="ink-nav__label">Recent</span><span class="ink-nav__badge">3</span><span class="ink-nav__mark"></span></button>
              </div>
            </div>
          </nav>
          <button class="ink-glass ink-glass--raised ink-sidebar__puck" id="ladderPuck" hidden aria-label="Show navigation" style="position:absolute;margin:var(--space-4)"><span class="ink-navbar__puckMark"></span></button>
          <div class="frame__body"><span class="ink-eyebrow" id="rungOut" style="color:#fff">full &mdash; 248px</span></div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkSidebar &middot; InkDrawer</span>
        <p><strong>full</strong> labels and section headings. <strong>rail</strong> icons only, still one press away. <strong>button</strong> one control that brings it back. <strong>hidden</strong> gone, for content that wants the screen.</p>
        <p><code>floating</code> insets it and rounds its corners so it reads as a panel over the content; <code>flush</code> runs to the edges and keeps its rule.</p>
        <p>Press <em>Open as drawer</em> for the phone answer: the same navigation over the content, with a scrim that is a real button because a drawer whose only exit is its own toggle is one people get stuck in.</p>
      </div>
    </div>
  </section>

  <!-- ── Text, chips, lists ─────────────────────────────────────────────── -->
  <section id="text-and-chips" style="margin-bottom:var(--space-10)">
    <h2>Text, chips &amp; lists</h2>
    <p class="sec-note">A chip is a thing in its own right &mdash; a filter that is on, a tag, a recipient. A badge is a fact <em>about</em> something else and is never pressable. The difference is interaction, not size.</p>

    <div class="spec">
      <div class="demo">
        <div class="rowc">
          <span class="ink-chip" data-selected><span class="ink-chip__press"><span class="ink-chip__label">American</span></span></span>
          <span class="ink-chip"><button class="ink-chip__press" type="button"><span class="ink-chip__label">British</span></button></span>
          <span class="ink-chip ink-chip--removable"><span class="ink-chip__press"><span class="ink-chip__label">ada@example.com</span></span><button class="ink-chip__remove" type="button" aria-label="Remove ada@example.com">${icon("x", 14)}</button></span>
          <span class="ink-chip ink-chip--removable" data-selected style="--ink-tone-fg: var(--color-success-fg); --ink-tone-soft: var(--color-success-soft)"><span class="ink-chip__press"><span class="ink-chip__label">Grade A</span></span><button class="ink-chip__remove" type="button" aria-label="Remove Grade A">${icon("x", 14)}</button></span>
        </div>

        <div class="ink-search" style="max-width:340px">
          <span class="ink-search__icon" aria-hidden="true">${icon("search", 18)}</span>
          <input type="search" placeholder="Search what it remembers" aria-label="Search" value="se" id="searchDemo">
          <button class="ink-search__clear" type="button" aria-label="Clear search">${icon("x", 14)}</button>
        </div>

        <div class="ink-edge ink-group" style="max-width:420px">
          <header class="ink-group__head"><h2 class="ink-group__title">People</h2></header>
          <div class="ink-list" role="list" aria-label="People">
            <button class="ink-listitem ink-listitem--pressable" role="listitem" data-selected><span class="ink-listitem__lead"><span class="ink-avatar" role="img" aria-label="Ada Lovelace">AL</span></span><span class="ink-listitem__text"><span class="ink-listitem__title">Ada Lovelace</span><span class="ink-listitem__desc">Last seen this morning</span></span><span class="ink-listitem__trail">${icon("chevron-right", 18)}</span></button>
            <button class="ink-listitem ink-listitem--pressable" role="listitem"><span class="ink-listitem__lead"><span class="ink-avatar" role="img" aria-label="Grace Hopper">GH</span></span><span class="ink-listitem__text"><span class="ink-listitem__title">Grace Hopper</span><span class="ink-listitem__desc">Last seen on Tuesday</span></span><span class="ink-listitem__trail">${icon("chevron-right", 18)}</span></button>
          </div>
        </div>

        <div class="rowc">
          <span class="ink-avatargroup" role="group" aria-label="On this file: Ada, Grace, Alan, Katherine, Jean" style="--ink-avatar-size:32px">
            <span class="ink-avatar" role="img" aria-label="Ada">AL</span>
            <span class="ink-avatar" role="img" aria-label="Grace">GH</span>
            <span class="ink-avatar" role="img" aria-label="Alan">AT</span>
            <span class="ink-avatar" role="img" aria-label="Katherine">KJ</span>
            <span class="ink-avatar ink-avatargroup__rest" aria-hidden="true">+2</span>
          </span>
          <span class="ink-tooltip" data-placement="top" id="tipDemo">
            <span class="ink-tooltip__anchor"><button class="ink-btn ink-btn--quiet" type="button" style="min-height:var(--ctl-h-sm);padding:0 var(--ctl-px-sm)">Hover me</button></span>
            <span class="ink-tooltip__bubble" role="tooltip">Never put anything here a reader needs.</span>
          </span>
          <a class="ink-link" href="#text-and-chips">An inline link</a>
          <a class="ink-link" href="#text-and-chips">External<span class="ink-link__external"></span></a>
        </div>

        <span class="ink-eyebrow">Autocomplete, shown open</span>
        <!-- The list hangs below its input; the space it needs is reserved
             around the control rather than on it, or it hangs below that. -->
        <div style="min-height:210px">
        <div class="ink-autocomplete" style="max-width:340px">
          <div class="ink-search">
            <span class="ink-search__icon" aria-hidden="true">${icon("search", 18)}</span>
            <input type="text" role="combobox" aria-expanded="true" aria-label="Go to" value="se" readonly>
          </div>
          <ul class="ink-autocomplete__list" role="listbox" aria-label="Go to">
            <li class="ink-autocomplete__option" role="option" aria-selected="true"><span class="ink-autocomplete__text"><mark>Se</mark><span>ttings</span></span></li>
            <li class="ink-autocomplete__option" role="option" aria-selected="false"><span class="ink-autocomplete__text"><mark>Se</mark><span>ssions</span></span></li>
            <li class="ink-autocomplete__option" role="option" aria-selected="false"><span class="ink-autocomplete__text"><span>Voice </span><mark>se</mark><span>nsitivity</span></span></li>
          </ul>
        </div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkChip &middot; InkSearchField &middot; InkAutocomplete &middot; InkList &middot; InkListItem &middot; InkAvatarGroup &middot; InkTooltip &middot; InkLink</span>
        <p>The remove control is separate from the chip. A chip that vanishes when you meant to select it is the worst outcome available.</p>
        <p>Autocomplete ranks a prefix above a word-start above a mid-word match, so typing &ldquo;se&rdquo; offers Settings before Voice sensitivity. Array order is not an answer.</p>
        <p>A list item is a <em>record</em> &mdash; lead, two lines, trail. <code>InkRow</code> is a <em>setting</em> &mdash; a label and one control.</p>
        <p>Links are underlined. A link marked only by colour is invisible to a reader who cannot distinguish it.</p>
      </div>
    </div>
  </section>

  <!-- ── More controls ──────────────────────────────────────────────────── -->
  <section id="more-controls">
    <h2>More controls</h2>

    <div class="spec">
      <div class="demo row">
        <div class="iconPanel">
          <span class="ink-eyebrow">Number field</span>
          <div class="ink-number">
            <button class="ink-number__step" type="button" aria-label="Decrease quantity">${icon("minus", 18)}</button>
            <input type="text" inputmode="decimal" value="12" aria-label="Quantity">
            <button class="ink-number__step" type="button" aria-label="Increase quantity">${icon("plus", 18)}</button>
          </div>
          <span class="ink-eyebrow">Rating</span>
          <div class="ink-rating" role="radiogroup" aria-label="Rating" id="rating">
            <button class="ink-rating__button" type="button" role="radio" aria-checked="false" aria-label="1 out of 5"><span class="ink-rating__mark" data-on></span></button>
            <button class="ink-rating__button" type="button" role="radio" aria-checked="false" aria-label="2 out of 5"><span class="ink-rating__mark" data-on></span></button>
            <button class="ink-rating__button" type="button" role="radio" aria-checked="true" aria-label="3 out of 5"><span class="ink-rating__mark" data-on></span></button>
            <button class="ink-rating__button" type="button" role="radio" aria-checked="false" aria-label="4 out of 5"><span class="ink-rating__mark"></span></button>
            <button class="ink-rating__button" type="button" role="radio" aria-checked="false" aria-label="5 out of 5"><span class="ink-rating__mark"></span></button>
          </div>
          <span class="ink-eyebrow">Button group</span>
          <div class="ink-btngroup ink-btngroup--horizontal" role="group" aria-label="Alignment">
            <button class="ink-btn ink-btn--quiet" type="button">Left</button>
            <button class="ink-btn ink-btn--quiet" type="button">Centre</button>
            <button class="ink-btn ink-btn--quiet" type="button">Right</button>
          </div>
        </div>

        <div class="col" style="flex:1;min-width:280px">
          <span class="ink-eyebrow">Accordion</span>
          <div class="ink-accordion" role="group" aria-label="Questions">
            <details class="ink-accordion__item" open>
              <summary class="ink-accordion__head"><span class="ink-accordion__title">Where does the edge come from?</span><span class="ink-accordion__mark" aria-hidden="true">${icon("chevron-down", 18)}</span></summary>
              <div class="ink-accordion__body">A 2px border printed 4px above a hard plate. Built on the platform <code>&lt;details&gt;</code>, so find-in-page reaches inside a closed panel.</div>
            </details>
            <details class="ink-accordion__item">
              <summary class="ink-accordion__head"><span class="ink-accordion__title">Why no icon set?</span><span class="ink-accordion__meta">optional</span><span class="ink-accordion__mark" aria-hidden="true">${icon("chevron-down", 18)}</span></summary>
              <div class="ink-accordion__body">lucide-react and lucide-react-native already agree. Every mark this library needs, it draws.</div>
            </details>
          </div>
          <span class="ink-eyebrow">Timeline</span>
          <ol class="ink-timeline" aria-label="Progress">
            <li class="ink-timeline__entry" data-state="done"><span class="ink-timeline__marker"></span><div class="ink-timeline__body"><span class="ink-eyebrow">09:02</span><span class="ink-timeline__title">Export queued</span></div></li>
            <li class="ink-timeline__entry" data-state="current"><span class="ink-timeline__marker"></span><div class="ink-timeline__body"><span class="ink-eyebrow">09:10</span><span class="ink-timeline__title">Writing files</span><span class="ink-prose">About four minutes left.</span></div></li>
            <li class="ink-timeline__entry" data-state="todo"><span class="ink-timeline__marker"></span><div class="ink-timeline__body"><span class="ink-timeline__title">Verify</span></div></li>
          </ol>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkNumberField &middot; InkRating &middot; InkButtonGroup &middot; InkAccordion &middot; InkTimeline</span>
        <p>The number field is <code>type="text"</code> with a numeric keypad, not <code>type="number"</code> &mdash; which silently discards what it cannot parse and scrolls its value when the wheel passes over it.</p>
        <p>The rating is a radio group wearing marks, which is what a rating is: arrow keys, one tab stop and an announced value for free.</p>
        <p>The accordion is <code>&lt;details&gt;</code>. Find-in-page reaching inside a closed panel is the thing a hand-rolled one loses that people notice.</p>
      </div>
    </div>
  </section>

  <!-- ── Progress through things ────────────────────────────────────────── -->
  <section id="progress">
    <h2>Getting somewhere</h2>

    <div class="spec">
      <div class="demo">
        <ol class="ink-stepper ink-stepper--horizontal" aria-label="Setup">
          <li class="ink-stepper__step" data-state="done"><button class="ink-stepper__body" type="button"><span class="ink-stepper__marker">${icon("check", 16)}</span><span class="ink-stepper__text"><span class="ink-stepper__label">Account</span></span></button></li>
          <li class="ink-stepper__step" data-state="done"><button class="ink-stepper__body" type="button"><span class="ink-stepper__marker">${icon("check", 16)}</span><span class="ink-stepper__text"><span class="ink-stepper__label">Voice</span></span></button></li>
          <li class="ink-stepper__step" data-state="current"><div class="ink-stepper__body" aria-current="step"><span class="ink-stepper__marker">3</span><span class="ink-stepper__text"><span class="ink-stepper__label">Rooms</span><span class="ink-stepper__desc">Where things are</span></span></div></li>
          <li class="ink-stepper__step" data-state="todo"><div class="ink-stepper__body"><span class="ink-stepper__marker">4</span><span class="ink-stepper__text"><span class="ink-stepper__label">Finish</span></span></div></li>
        </ol>

        <nav class="ink-pagination" aria-label="Pagination" id="pager">
          <button class="ink-pagination__step" type="button" aria-label="Previous page">${icon("chevron-left")}</button>
          <button class="ink-pagination__page" type="button" aria-label="Page 1">1</button>
          <span class="ink-pagination__gap">&hellip;</span>
          <button class="ink-pagination__page" type="button" aria-label="Page 11">11</button>
          <button class="ink-pagination__page" type="button" aria-label="Page 12" aria-current="page">12</button>
          <button class="ink-pagination__page" type="button" aria-label="Page 13">13</button>
          <span class="ink-pagination__gap">&hellip;</span>
          <button class="ink-pagination__page" type="button" aria-label="Page 40">40</button>
          <button class="ink-pagination__step" type="button" aria-label="Next page">${icon("chevron-right")}</button>
        </nav>

        <div class="rowc" style="gap:var(--space-8)">
          <button class="ink-fab" type="button" data-position="static" aria-label="New conversation">${icon("plus", 24)}</button>
          <button class="ink-fab ink-fab--extended" type="button" data-position="static">${icon("plus", 24)}<span class="ink-fab__label">New conversation</span></button>
          <div class="ink-speeddial" data-position="static" data-open id="dial">
            <div class="ink-speeddial__actions" role="menu" aria-label="Create">
              <button class="ink-speeddial__action" type="button" role="menuitem"><span class="ink-speeddial__actionLabel">Note</span><span class="ink-speeddial__actionIcon">${icon("file-text")}</span></button>
              <button class="ink-speeddial__action" type="button" role="menuitem"><span class="ink-speeddial__actionLabel">Routine</span><span class="ink-speeddial__actionIcon">${icon("repeat")}</span></button>
            </div>
            <button class="ink-fab" type="button" aria-label="Create" aria-expanded="true"><span class="ink-speeddial__mark" aria-hidden="true">${icon("plus", 24)}</span></button>
          </div>
        </div>
      </div>
      <div class="note">
        <span class="ink-eyebrow">InkStepper &middot; InkPagination &middot; InkFab &middot; InkSpeedDial</span>
        <p>A completed step is pressable and a future one is not. Going back is always allowed; skipping ahead is the product&rsquo;s decision and it has to say so.</p>
        <p>The pagination keeps a <strong>constant width</strong> wherever the page is. Clamping the window naively collapses it at the ends, so the &ldquo;next&rdquo; button moves between clicks and the reader chases it.</p>
        <p>A fab wears the edge, because it is the thing the screen is <em>for</em> &mdash; content rather than chrome, and the one floating control that earns the plate.</p>
      </div>
    </div>
  </section>

  <footer style="margin-top:var(--space-16);padding-top:var(--space-6);border-top:var(--ink-border-width) solid var(--color-text)">
    <p class="ink-prose"><strong>Ink</strong> &mdash; ${componentCount} components on React and React Native, zero runtime dependencies. Generated from <code>dist/</code>.</p>
  </footer>
</div>

<script>
// ── Theme toggle ────────────────────────────────────────────────────────────
(function () {
  var root = document.documentElement;
  var label = document.getElementById("themeLabel");
  function current() {
    if (root.dataset.theme) return root.dataset.theme;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function sync() { label.textContent = current() === "dark" ? "Light" : "Dark"; }
  document.getElementById("theme").addEventListener("click", function () {
    root.dataset.theme = current() === "dark" ? "light" : "dark";
    sync();
  });
  sync();
})();

// ── Radio groups and tablists: selection follows focus, one tab stop ────────
document.querySelectorAll('[role="radiogroup"], [role="tablist"]').forEach(function (group) {
  var sel = group.getAttribute("role") === "tablist" ? '[role="tab"]' : '[role="radio"]';
  var attr = group.getAttribute("role") === "tablist" ? "aria-selected" : "aria-checked";
  var items = Array.prototype.slice.call(group.querySelectorAll(sel));
  function choose(next) {
    items.forEach(function (i) {
      var on = i === next;
      i.setAttribute(attr, String(on));
      i.tabIndex = on ? 0 : -1;
    });
  }
  items.forEach(function (i) { i.addEventListener("click", function () { if (!i.disabled) choose(i); }); });
  group.addEventListener("keydown", function (e) {
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (keys.indexOf(e.key) === -1) return;
    e.preventDefault();
    var live = items.filter(function (i) { return !i.disabled; });
    var at = Math.max(0, live.findIndex(function (i) { return i.getAttribute(attr) === "true"; }));
    var fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    var next = e.key === "Home" ? 0 : e.key === "End" ? live.length - 1
      : (at + (fwd ? 1 : -1) + live.length) % live.length;
    choose(live[next]);
    live[next].focus();
  });
});

// ── Checkboxes cycle so the third state is reachable ───────────────────────
document.querySelectorAll(".ink-checkbox").forEach(function (box) {
  box.addEventListener("click", function () {
    var order = ["off", "on", "mixed"];
    var next = order[(order.indexOf(box.dataset.state) + 1) % order.length];
    box.dataset.state = next;
    box.setAttribute("aria-checked", next === "mixed" ? "mixed" : String(next === "on"));
  });
});

// ── Switches ───────────────────────────────────────────────────────────────
document.querySelectorAll('[role="switch"]').forEach(function (s) {
  s.addEventListener("click", function () {
    s.setAttribute("aria-checked", s.getAttribute("aria-checked") === "true" ? "false" : "true");
  });
});

// ── Menu ───────────────────────────────────────────────────────────────────
(function () {
  var trigger = document.getElementById("menuTrigger");
  var list = document.getElementById("menuList");
  function close() { list.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = list.hidden;
    list.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("mousedown", function (e) { if (!document.getElementById("menu").contains(e.target)) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  list.querySelectorAll('[role="menuitem"]').forEach(function (i) { i.addEventListener("click", close); });
})();

// ── The three stages, driven by hand so the page can demonstrate them ──────
(function () {
  var order = ["expanded", "condensed", "collapsed"];
  var at = 1;
  var nav = document.getElementById("nav"), bot = document.getElementById("bot");
  function paint() {
    var stage = order[at];
    [[nav, "navBody", "navPuck"], [bot, "botBody", "botPuck"]].forEach(function (t) {
      t[0].dataset.stage = stage;
      t[0].dataset.material = String(stage !== "expanded");
      var body = document.getElementById(t[1]);
      if (stage === "collapsed") body.setAttribute("inert", ""); else body.removeAttribute("inert");
      document.getElementById(t[2]).tabIndex = stage === "collapsed" ? 0 : -1;
    });
    document.getElementById("stageOut").textContent = "stage: " + stage;
  }
  document.getElementById("stagePrev").addEventListener("click", function () { at = Math.max(0, at - 1); paint(); });
  document.getElementById("stageNext").addEventListener("click", function () { at = Math.min(2, at + 1); paint(); });
  // The puck restores the bar; it does not fire the action underneath it.
  ["navPuck", "botPuck"].forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () { at = 0; paint(); });
  });
  paint();
})();

// ── The sidebar ladder ─────────────────────────────────────────────────────
(function () {
  var side = document.getElementById("ladder");
  var puck = document.getElementById("ladderPuck");
  var out = document.getElementById("rungOut");
  var widths = { full: "248px", rail: "68px", button: "0", hidden: "0" };
  document.querySelectorAll("[data-rung]").forEach(function (b) {
    b.addEventListener("click", function () {
      var rung = b.dataset.rung;
      side.dataset.size = rung;
      side.classList.toggle("ink-sidebar--rail", rung === "rail");
      side.hidden = rung === "button" || rung === "hidden";
      puck.hidden = rung !== "button";
      out.textContent = rung + " — " + widths[rung];
    });
  });
  puck.addEventListener("click", function () {
    document.querySelector('[data-rung="full"]').click();
  });
})();

// ── Drawer ─────────────────────────────────────────────────────────────────
(function () {
  var open = document.getElementById("openDrawer");
  if (!open) return;
  var drawer = document.createElement("div");
  drawer.className = "ink-drawer ink-drawer--start";
  drawer.innerHTML =
    '<button class="ink-drawer__scrim" type="button" aria-label="Close navigation"></button>' +
    '<aside class="ink-glass ink-glass--raised ink-drawer__panel" aria-label="Navigation">' +
    '<span class="ink-eyebrow">Navigation</span>' +
    '<button class="ink-nav__item ink-nav__item--row" aria-current="page"><span class="ink-nav__icon">${icon("layers")}</span><span class="ink-nav__label">Everything</span><span class="ink-nav__mark"></span></button>' +
    '<button class="ink-nav__item ink-nav__item--row"><span class="ink-nav__icon">${icon("clock")}</span><span class="ink-nav__label">Recent</span><span class="ink-nav__badge">3</span><span class="ink-nav__mark"></span></button>' +
    "</aside>";
  document.body.appendChild(drawer);
  function close() { delete drawer.dataset.open; drawer.setAttribute("aria-hidden", "true"); }
  open.addEventListener("click", function () { drawer.dataset.open = ""; drawer.removeAttribute("aria-hidden"); });
  drawer.querySelector(".ink-drawer__scrim").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  close();
})();

// ── Rating ─────────────────────────────────────────────────────────────────
(function () {
  var group = document.getElementById("rating");
  if (!group) return;
  var buttons = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
  buttons.forEach(function (b, i) {
    b.addEventListener("click", function () {
      buttons.forEach(function (other, j) {
        other.setAttribute("aria-checked", String(j === i));
        var mark = other.querySelector(".ink-rating__mark");
        if (j <= i) mark.setAttribute("data-on", ""); else mark.removeAttribute("data-on");
      });
    });
  });
})();

// ── Rail toggle ────────────────────────────────────────────────────────────
(function () {
  var side = document.getElementById("side");
  function toggle() {
    var rail = side.classList.toggle("ink-sidebar--rail");
    document.getElementById("railToggle").setAttribute("aria-label", rail ? "Expand navigation" : "Collapse navigation");
    side.querySelectorAll(".ink-nav__item").forEach(function (item) {
      var label = item.querySelector(".ink-nav__label");
      if (label) item.setAttribute("aria-label", rail ? label.textContent : "");
    });
  }
  document.getElementById("railToggle").addEventListener("click", toggle);
  document.getElementById("railBtn").addEventListener("click", toggle);
})();
</script>
`;

writeFileSync(out, html);
console.log(`gallery -> ${out} (${Math.round(html.length / 1024)} KB)`);
