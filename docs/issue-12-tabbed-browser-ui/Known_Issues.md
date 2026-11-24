# Known issues - issue-12

- Each tab holds a native web contents. Many heavy tabs increase memory use; no cap is set yet.
- Tab order cannot be changed by drag and drop.
- Tabs are not restored after restart.
- The unified bar shows three tab pills. Extra tabs stay in an overflow menu with titles but no
  favicons and no live previews.
- Only the active tab can be captured, read, or recorded.
- Google sign-in still needs a real-account test on `WebContentsView`. ADR 0005 records that risk,
  and ADR 0009 adds no Chrome, OAuth, or WebView2 fallback.
- The sidebar takes 232 px when expanded and 60 px when collapsed.
- This change is local. Push, PR, installer rebuild, and reinstall need explicit approval.
