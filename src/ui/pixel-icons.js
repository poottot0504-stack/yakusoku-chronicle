const SEGMENTER = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
  : null;

const EMOJI_GRAPHEME_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3\u2600-\u27BF]/u;

export function isEmojiGrapheme(value = '') {
  return EMOJI_GRAPHEME_RE.test(value);
}

function graphemes(value) {
  if (SEGMENTER) return Array.from(SEGMENTER.segment(value), entry => entry.segment);
  return Array.from(value);
}

export function splitEmojiText(value = '') {
  const result = [];
  let textBuffer = '';
  const flushText = () => {
    if (!textBuffer) return;
    result.push({ type: 'text', value: textBuffer });
    textBuffer = '';
  };
  for (const segment of graphemes(value)) {
    if (isEmojiGrapheme(segment)) {
      flushText();
      result.push({ type: 'emoji', value: segment });
    } else {
      textBuffer += segment;
    }
  }
  flushText();
  return result;
}

export function pixelIconFilename(emoji = '') {
  return Array.from(emoji, ch => ch.codePointAt(0).toString(16)).join('-') + '.png';
}

export function pixelIconPath(emoji = '') {
  return `./assets/pixel-icons/${pixelIconFilename(emoji)}`;
}

function makePixelIcon(emoji, doc) {
  const img = doc.createElement('img');
  img.className = 'pixel-icon';
  img.src = pixelIconPath(emoji);
  img.alt = emoji;
  img.title = emoji;
  img.draggable = false;
  img.dataset.pixelIcon = 'true';
  img.addEventListener('error', () => {
    // Do not replace a missing pixel asset with a bare text node.
    // A bare emoji text node would be picked up by the MutationObserver again,
    // causing an image -> emoji -> image retry loop and visible flicker.
    const fallback = doc.createElement('span');
    fallback.dataset.noPixelIcon = 'true';
    fallback.className = 'pixel-icon-fallback';
    fallback.textContent = emoji;
    fallback.setAttribute('aria-label', emoji);
    img.replaceWith(fallback);
  }, { once: true });
  return img;
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('script,style,textarea,input,select,option,[contenteditable="true"],[data-no-pixel-icon],.pixel-icon'));
}

function transformTextNode(node, doc) {
  if (!node?.nodeValue || shouldSkipTextNode(node) || !EMOJI_GRAPHEME_RE.test(node.nodeValue)) return;
  const parts = splitEmojiText(node.nodeValue);
  if (!parts.some(part => part.type === 'emoji')) return;
  const fragment = doc.createDocumentFragment();
  for (const part of parts) {
    fragment.append(part.type === 'emoji' ? makePixelIcon(part.value, doc) : doc.createTextNode(part.value));
  }
  node.replaceWith(fragment);
}

function transformTree(root, doc) {
  if (!root) return;
  if (root.nodeType === 3) {
    transformTextNode(root, doc);
    return;
  }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  const walker = doc.createTreeWalker(root, globalThis.NodeFilter?.SHOW_TEXT ?? 4);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => transformTextNode(node, doc));
}

export function installPixelIconRenderer(doc = globalThis.document) {
  if (!doc?.body || typeof globalThis.MutationObserver === 'undefined') return null;
  if (doc.documentElement.dataset.pixelIconRenderer === 'on') return null;
  doc.documentElement.dataset.pixelIconRenderer = 'on';
  transformTree(doc.body, doc);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') transformTextNode(record.target, doc);
      for (const node of record.addedNodes ?? []) transformTree(node, doc);
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
  return observer;
}
