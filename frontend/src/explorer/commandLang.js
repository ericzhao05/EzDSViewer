// Helpers for writing commands and share links.

export const MAX_LINK_CHARS = 2000;

// encodeURIComponent leaves ! ' ( ) * alone; encode them too so links survive chat apps and markdown.
// Lone surrogates make encodeURIComponent throw, so they become U+FFFD first.
function wellFormed(text) {
  return String(text).replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '\uFFFD'
  );
}

export function encodeCommand(text) {
  return encodeURIComponent(wellFormed(text)).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function quoteArg(value) {
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return String(value);
}

export function buildCall(method, args) {
  return `${method}(${args.map(quoteArg).join(', ')})`;
}

export function linkFor(origin, command, page = 'v') {
  return `${origin}/${page}?c=${encodeCommand(command)}`;
}
