import sanitizeHtml from "sanitize-html";

// Course descriptions come from the editor as HTML and are shown as HTML to every student, so only formatting may
// stay: a script, an event handler or a javascript: link would run in each viewer's browser.
const DESCRIPTION_RULES = {
  allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "blockquote", "pre", "code", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

export const cleanDescription = (html) => sanitizeHtml(String(html || ""), DESCRIPTION_RULES).trim();

export const hasVisibleText = (html) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim() !== "";
