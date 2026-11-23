# UI design

Facts about the app's look and feel. The design system lives in `src/renderer/src/styles.css`
(tokens first, then controls, shell, and views); shared components live in
`src/renderer/src/components/`.

## Principles

Apple's interface principles, applied natively on Windows:

- **Clarity:** one primary (blue) action per view, a clear type hierarchy, and plain labels.
- **Deference:** quiet chrome; content (pages, screenshots, text) gets the space.
- **Depth:** a translucent sidebar over Mica, raised cards with soft shadows, and grouped
  backgrounds.

The app keeps Windows' own window buttons and uses no Apple assets: no traffic lights, SF
Symbols, or Apple fonts.

## Window chrome

- `titleBarStyle: 'hidden'` with `titleBarOverlay`: Windows draws minimize, maximize, and close
  over the top right of the app's 52-pixel toolbar, so snap layouts keep working. The button
  colour follows light and dark mode (`nativeTheme` `updated` event in `src/main/index.ts`).
- Every view's toolbar is the window's drag region; its buttons and fields are not. The toolbar
  leaves room for the caption buttons with `env(titlebar-area-*)` and a 138-pixel fallback
  (`.has-caption-buttons`, set in `main.tsx` when the bridge exists).
- Mica (`backgroundMaterial: 'mica'`) is used on Windows 11 22H2 (build 22621) and later
  (`supportsMica`); main reports it in `AppInfo.mica`, and `main.tsx` sets
  `data-material="mica"`, which makes the sidebar translucent. Elsewhere the sidebar is opaque.

## Tokens

| Token group | Values |
|---|---|
| Fonts | Segoe UI Variable Text and Display (Windows 11 system font); Cascadia Mono for text boxes and the package |
| Type scale | 22 px view hero, 17 px toolbar title, 14 px body, 13 px controls, 12 px secondary, 11 px badges |
| Colour | Accent #0071e3 (dark #0a84ff); green, orange, and red for success, warning, and error; each with a soft tint |
| Surfaces | Window, sidebar (translucent with Mica), surface, grouped background, raised card |
| Radius | 6, 10, 14, and 20 px |
| Shadow | Three levels, each with a hairline ring |
| Motion | 120 ms and 220 ms with one ease curve; all motion off under `prefers-reduced-motion` |

Dark mode redefines every colour and shadow under `prefers-color-scheme: dark`.

## Components

- **Buttons:** `.btn-primary` (one per view), `.btn-secondary`, `.btn-plain` (text, with a
  destructive variant), `.icon-btn`. Below 1240 pixels wide, toolbar buttons hide their label
  and keep the icon, title, and accessible name.
- **Switch:** `.switch` is a styled checkbox, so keyboard and screen readers work; item switches
  use `role="switch"` with `aria-checked`; group switches stay checkboxes because they can show a
  middle state ("some included").
- **Segmented control:** `.segmented` with radio inputs (Detailed and Compact).
- **Banner:** `.banner` with `data-tone` info, success, warning, or error and an icon.
- **Icons:** lucide-react 1.68.0 (ISC licence), pinned to a release at least two weeks old;
  outline icons at 13 to 20 pixels.

## App icon

- Source: `resources/icon.svg`, a blue gradient tile with the white lucide "layers" glyph, the
  same mark as the sidebar.
- `npm run icon` runs `scripts/build-icon.mjs` with Electron: one offscreen Chromium window draws
  the SVG at 16, 20, 24, 32, 40, 48, 64, 96, 128, and 256 pixels (a thicker stroke at 32 and
  below) and writes `resources/icon.png` and a PNG-based `resources/icon.ico`.
- electron-builder puts the icon on the app exe, the installer, and the uninstaller. In
  development, `src/main/index.ts` sets it on the window, because Electron's own exe would show
  the Electron atom. `app.setAppUserModelId('com.aicontextbridge.app')` matches `appId`, so the
  taskbar groups the running app with its shortcuts.

## Shell and views

- **Sidebar:** app mark and name, navigation with icons and live counts (screenshots, included
  context items), and a footer with the active page, the capture state, and the app version. The
  footer replaced the old status bar.
- **Browser:** Safari-style toolbar: back, forward, reload; an address field that shows a centred
  security icon and host while idle and the full URL while editing; Extract page text and
  Capture screenshot. A loading bar runs under the toolbar. A strip with the security badge,
  title, URL, and capture state shows when a page is open. The start screen offers suggestions.
- **Screenshots:** a card grid with large rounded thumbnails, a frosted position badge, hover and
  keyboard-focus actions (move earlier, move later, remove), and an OCR status icon.
- **Context:** two panes: the review list on a grouped background (privacy card, notes,
  screenshots, pages, each item a card with an include switch) and the package preview as a
  document with its size and token estimate.
