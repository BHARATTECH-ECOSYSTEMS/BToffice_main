import DOMPurify from "dompurify";

// The server already cleans descriptions when they are saved; this second pass covers courses saved before that and
// keeps the same short list of formatting tags.
const RULES = {
  ALLOWED_TAGS: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "blockquote", "pre", "code", "a"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

export const safeDescription = (html) => DOMPurify.sanitize(String(html || ""), RULES);
