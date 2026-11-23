/**
 * Isolated world for the extraction script. 0 is the page's own world and Electron uses 999 for
 * preload scripts; any other id from 1 to 536870911 works.
 */
export const EXTRACT_WORLD_ID = 1001;

/**
 * Runs in an isolated world: it shares the page's DOM but not its JavaScript, so page scripts
 * cannot replace the functions it calls or feed it fake results. It returns plain data only:
 * { title, scope, selection, blocks, truncated }. Main checks the result again
 * (page-result.ts), so these limits only keep the walk itself fast; the real limits live in
 * PAGE_LIMITS.
 *
 * Plain ES5-style string on purpose: bundlers do not touch it and no helper code is needed.
 */
export const EXTRACT_SCRIPT = String.raw`(function () {
  var MAX_CHARS = 60000;
  var MAX_BLOCKS = 5000;
  var MAX_VISITED = 40000;
  var MAX_TABLES = 21;
  var MAX_ROWS = 101;
  var MAX_COLS = 16;
  var MAX_CELL = 301;
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, CANVAS: 1, IFRAME: 1,
    OBJECT: 1, EMBED: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1, IMG: 1, BUTTON: 1, SELECT: 1,
    OPTION: 1, TEXTAREA: 1, INPUT: 1, MAP: 1 };
  var LANDMARK_TAGS = { HEADER: 1, FOOTER: 1, ASIDE: 1 };
  var LANDMARK_ROLES = { banner: 1, contentinfo: 1, complementary: 1, search: 1 };

  var blocks = [];
  var chars = 0;
  var visited = 0;
  var tables = 0;
  var truncated = false;
  var buffer = '';
  var itemDepth = -1;
  var scope = 'body';

  function clean(text) { return String(text || '').replace(/[\s ]+/g, ' ').trim(); }

  function push(block, size) {
    if (blocks.length >= MAX_BLOCKS || chars + size > MAX_CHARS) { truncated = true; return; }
    blocks.push(block);
    chars += size;
  }

  function flush() {
    var text = clean(buffer);
    buffer = '';
    if (!text) return;
    if (itemDepth >= 0) push({ type: 'list-item', depth: itemDepth, text: text }, text.length + 4);
    else push({ type: 'text', text: text }, text.length + 2);
  }

  function isHidden(el, style) {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true;
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    if (style.display === 'contents') return false;
    if (el.getClientRects().length === 0) return true;
    // "Visually hidden" helper text for screen readers: a 1-pixel absolutely placed box.
    if (style.position === 'absolute') {
      var box = el.getBoundingClientRect();
      if (box.width <= 1 && box.height <= 1) return true;
    }
    return false;
  }

  function isPageChrome(el, tag) {
    var role = el.getAttribute('role');
    if (tag === 'NAV' || role === 'navigation') return true;
    if (scope !== 'body') return false;
    if (tag === 'ASIDE' || LANDMARK_ROLES[role]) return true;
    // A header or footer is page chrome only outside articles and sections.
    if (LANDMARK_TAGS[tag]) return !el.parentElement || !el.parentElement.closest('article, section, main, [role="main"]');
    return false;
  }

  function isLayoutTable(table) {
    var role = table.getAttribute('role');
    if (role === 'presentation' || role === 'none') return true;
    if (table.querySelector('th')) return false;
    var widest = 0;
    for (var r = 0; r < table.rows.length; r++) widest = Math.max(widest, table.rows[r].cells.length);
    return widest < 2;
  }

  function readTable(table) {
    var rows = [];
    var size = 0;
    for (var r = 0; r < table.rows.length && rows.length < MAX_ROWS; r++) {
      var row = table.rows[r];
      var rowStyle = getComputedStyle(row);
      if (rowStyle.display === 'none' || rowStyle.visibility === 'hidden') continue;
      var cells = [];
      var hasText = false;
      for (var c = 0; c < row.cells.length && c < MAX_COLS; c++) {
        var cell = clean(row.cells[c].innerText).slice(0, MAX_CELL);
        if (cell) hasText = true;
        cells.push(cell);
        size += cell.length + 3;
      }
      if (hasText) rows.push(cells);
    }
    if (table.rows.length > MAX_ROWS) truncated = true;
    var caption = table.caption ? clean(table.caption.innerText).slice(0, MAX_CELL) : '';
    return { block: { type: 'table', rows: rows, caption: caption }, size: size + 8 };
  }

  function walk(el, listDepth) {
    for (var node = el.firstChild; node; node = node.nextSibling) {
      if (truncated) return;
      if (node.nodeType === 3) { buffer += node.data; continue; }
      if (node.nodeType !== 1) continue;
      if (++visited > MAX_VISITED) { truncated = true; return; }
      var tag = node.tagName.toUpperCase();
      if (SKIP[tag] || isPageChrome(node, tag)) continue;
      var style = getComputedStyle(node);
      if (isHidden(node, style)) continue;

      var heading = /^H([1-6])$/.exec(tag);
      if (heading) {
        flush();
        var title = clean(node.innerText);
        if (title) push({ type: 'heading', level: Number(heading[1]), text: title }, title.length + 8);
        continue;
      }
      if (tag === 'TABLE' && !isLayoutTable(node)) {
        flush();
        if (tables >= MAX_TABLES) { truncated = true; continue; }
        var table = readTable(node);
        if (table.block.rows.length) { tables++; push(table.block, table.size); }
        continue;
      }
      if (tag === 'PRE') {
        flush();
        var code = String(node.innerText || '').replace(/\s+$/, '');
        if (code.trim()) push({ type: 'pre', text: code }, code.length + 8);
        continue;
      }
      if (tag === 'BR') { flush(); continue; }
      if (tag === 'UL' || tag === 'OL') {
        flush();
        walk(node, listDepth + 1);
        continue;
      }
      if (tag === 'LI') {
        flush();
        var savedDepth = itemDepth;
        itemDepth = Math.max(0, listDepth);
        walk(node, listDepth);
        flush();
        itemDepth = savedDepth;
        continue;
      }
      var display = style.display;
      if (display === 'inline' || display === 'inline-block' || display === 'inline-flex' ||
          display === 'inline-grid' || display === 'contents') {
        walk(node, listDepth);
      } else {
        flush();
        walk(node, listDepth);
        flush();
      }
    }
  }

  function textLength(el) {
    return el && !isHidden(el, getComputedStyle(el)) ? clean(el.innerText).length : 0;
  }

  var root = document.body;
  var main = document.querySelector('main, [role="main"]');
  var articles = document.querySelectorAll('article');
  if (main && textLength(main) >= 200) { root = main; scope = 'main'; }
  else if (articles.length === 1 && textLength(articles[0]) >= 200) { root = articles[0]; scope = 'article'; }

  if (root) { walk(root, -1); flush(); }
  var selection = window.getSelection ? String(window.getSelection()) : '';
  return {
    title: String(document.title || ''),
    scope: scope,
    selection: selection.slice(0, 10001),
    blocks: blocks,
    truncated: truncated
  };
})()`;
