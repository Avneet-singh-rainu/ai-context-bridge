# Test cases - issue-12

Manual cases for the local Electron window. No UI test run is part of this session.

## Opening and switching tabs

| Case | Steps | Expected |
|---|---|---|
| Start empty | Open the app and choose Browser | One compact bar; the plus button is visible; no tab or page is open |
| First page | Open `example.com` | One tab appears with `Example Domain`; the page loads in the native view |
| New tab | Click plus | A new empty tab is active; the start panel shows; the first tab stays |
| Second page | Open `example.org` in the empty tab | Two tabs show their titles; the second page is active |
| Switch tab | Click the first tab | The first page returns; the address field shows `example.com` |
| Close tab | Click the close button on the second tab | One tab stays; the first page remains active |
| Close last tab | Close the last tab | No tabs show; the start panel returns |
| Popup | Open a page with `window.open` to an https URL | A new in-app tab opens; no separate browser window appears |

## Overflow menu

| Case | Steps | Expected |
|---|---|---|
| Four tabs | Open four pages | Three pills and a `1` overflow button show |
| Open menu | Click the overflow button | The hidden tab title appears in a small menu |
| Switch from menu | Click the hidden tab | The hidden page becomes active and the menu closes |
| Close from menu | Click the close button beside a hidden tab | That tab closes and the menu stays usable |
| Outside click | Open the menu, then click the page | The menu closes |

## Unified bar and sidebar

| Case | Steps | Expected |
|---|---|---|
| One bar | Open Browser | One 36 px bar holds tab pills, navigation, address, and page actions |
| Sidebar | Open any view | The 232 px sidebar shows view options, counts, and a status footer |
| Collapse sidebar | Click the collapse control | The sidebar becomes a 60 px icon rail; labels and footer are hidden |
| No page strip | Open a page | No strip below the bar shows the URL or `Capture: Idle`; the sidebar footer shows the active host |
| Capture status | Capture a page | The added-file status appears in the sidebar footer |
| Tab pills | Open two pages | Tab pills show page titles in the unified bar |
| More tabs | Open more than three pages | Three pills and an overflow count show; extra tabs stay in the overflow menu |
| Narrow window | Shrink the window | The address field shrinks; hidden tabs stay in the overflow menu |

## Capture and recording

| Case | Steps | Expected |
|---|---|---|
| Active capture | Switch tabs, then capture | The visible active page is captured |
| Active extract | Switch tabs, then extract | Text comes from the active page |
| Stop on switch | Start network recording, then switch tabs | Recording stops with a network notice |
| Stop on close | Start network recording, then close the active tab | Recording stops with a network notice |
| Security rules | Try a `file:` link in a tab | The link is blocked with a notice |
