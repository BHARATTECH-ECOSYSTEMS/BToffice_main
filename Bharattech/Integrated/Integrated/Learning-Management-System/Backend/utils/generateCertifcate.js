const fs = require("fs");
const path = require("path");
const {
  PDFDocument,
  rgb,
  degrees,
  LineCapStyle,
  LineJoinStyle,
  setLineJoin,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { certificateContent } = require("./certificateTemplate");

// The company's certificate design (owner, 2026-10-29), drawn from its 1122 × 1402 px sample: every position below is
// that sample's pixel, top-left origin, turned into PDF points by px() and top(). The page keeps the sample's shape.
const SAMPLE_W = 1122;
const SAMPLE_H = 1402;
const PAGE_W = 595.28;
const S = PAGE_W / SAMPLE_W;
const PAGE_H = SAMPLE_H * S;
const px = (value) => value * S;
const top = (y) => PAGE_H - y * S;

const ASSETS = path.join(__dirname, "../assets/certificate");
const FONTS = path.join(__dirname, "../fonts");
// Latin-only copies of Montserrat and DM Serif Display (SIL OFL, licences beside them), embedded whole: pdf-lib's own
// subsetting dropped letters from a font before (a blank name, 2026-10-29)
const FONT_FILES = {
  regular: "Montserrat-Regular-Latin.ttf",
  bold: "Montserrat-Bold-Latin.ttf",
  heavy: "Montserrat-ExtraBold-Latin.ttf",
  serif: "DMSerifDisplay-Regular-Latin.ttf",
};

const hex = (value) => rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);
// sampled from the company's image
const COLORS = {
  paper: hex("#FDFDFD"),
  watermark: hex("#EEEEEE"),
  violetText: hex("#5C35CC"),
  violetSoft: hex("#9A86D8"),
  rule: hex("#C9BAEC"),
  ink: hex("#1E2331"),
  body: hex("#20222F"),
  grey: hex("#92939C"),
  line: hex("#ADADB0"),
  arrow: hex("#182122"),
  white: rgb(1, 1, 1),
  // the left column, block by block
  b2: hex("#F6F6F6"),
  b2Disc: hex("#ECECED"),
  b3Violet: hex("#3D1AB3"),
  b3Navy: hex("#080C1F"),
  b4: hex("#EDECEE"),
  b4Circle: hex("#6E40F9"),
  b5: hex("#ECECEC"),
  b5Navy: hex("#0C1229"),
  b6: hex("#582CE3"),
};

// Where each part cut from the company's image sat in it ([left, top, right, bottom] sample pixels)
const CUTS = {
  logo: [460, 58, 874, 173],
  columnTop: [228, 13, 406, 191],
  signature: [436, 922, 720, 989],
  seal: [815, 919, 1019, 1123],
};

// the logo mark's three strokes, in its own -1…1 box (the site's favicon), drawn at any centre and radius
const LOGO_STROKES = [...fs.readFileSync(path.join(ASSETS, "logo-mark.svg"), "utf8").matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const LOGO_STROKE = 0.17;

const sanitizeName = (value) =>
  String(value || "User")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_");

const formatLabel = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

/** Everything drawn until `restore()` stays inside the shape `outline` traces (a list of path operators). */
const clipTo = (page, outline) => page.pushOperators(pushGraphicsState(), ...outline, clip(), endPath());
const restore = (page) => page.pushOperators(popGraphicsState());
const rectOutline = (x, y, w, h) => [moveTo(x, y), lineTo(x + w, y), lineTo(x + w, y + h), lineTo(x, y + h), closePath()];

// the path is drawn scaled by `r`, its stroke width included, so the width stays in the mark's own units; round joins
// keep its many short segments smooth
const drawLogoStrokes = (page, cx, cy, r, color, opacity = 1) => {
  page.pushOperators(pushGraphicsState(), setLineJoin(LineJoinStyle.Round));
  for (const d of LOGO_STROKES) {
    page.drawSvgPath(d, { x: cx, y: cy, scale: r, borderColor: color, borderWidth: LOGO_STROKE, borderLineCap: LineCapStyle.Round, borderOpacity: opacity });
  }
  restore(page);
};

/** Text with extra space between letters, as the sample's small capitals; returns where it ends. */
const drawSpaced = (page, text, { x, y, size, font, color, spacing, rotate }) => {
  let at = 0;
  for (const ch of text) {
    const w = font.widthOfTextAtSize(ch, size);
    if (rotate) page.drawText(ch, { x, y: y + at, size, font, color, rotate: degrees(90) });
    else page.drawText(ch, { x: x + at, y, size, font, color });
    at += w + spacing;
  }
  return at - spacing;
};
const spacedWidth = (text, font, size, spacing) => [...text].reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) + spacing * (text.length - 1);
/** The size at which `text` is `width` wide (the sample's measurement), never above `max` once real text is longer. */
const sizeFor = (font, text, width) => width / font.widthOfTextAtSize(text, 1);

const wrap = (font, text, size, maxWidth) => {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

/** An image cut from the company's image, drawn over the same sample pixels it was cut from. */
const drawCut = (page, image, [x0, y0, x1, y1]) => image && page.drawImage(image, { x: px(x0), y: top(y1), width: px(x1 - x0), height: px(y1 - y0) });

/** The left column of blocks, circles and curves, top to bottom as in the sample (x 228–405 px). */
const drawColumn = (page, columnTop) => {
  const x = px(228);
  const w = px(177);
  const block = (from, to) => ({ y: top(to), h: px(to - from) });

  // 1. the violet square with the logo's two white loops, cut from the company's image
  drawCut(page, columnTop, CUTS.columnTop);

  // 2. pale, with a slightly darker half disc leaning in from the left
  const b2 = block(190, 535);
  page.drawRectangle({ x, y: b2.y, width: w, height: b2.h, color: COLORS.b2 });
  clipTo(page, rectOutline(x, b2.y, w, b2.h));
  page.drawCircle({ x, y: b2.y + b2.h / 2, size: b2.h / 2, color: COLORS.b2Disc });
  restore(page);

  // 3. navy, with violet sweeping in from the top right
  const b3 = block(535, 742);
  page.drawRectangle({ x, y: b3.y, width: w, height: b3.h, color: COLORS.b3Navy });
  clipTo(page, rectOutline(x, b3.y, w, b3.h));
  page.drawCircle({ x: x + w, y: b3.y + b3.h, size: w * 1.08, color: COLORS.b3Violet });
  restore(page);

  // 4. pale, with a full violet circle
  const b4 = block(742, 935);
  page.drawRectangle({ x, y: b4.y, width: w, height: b4.h, color: COLORS.b4 });
  page.drawCircle({ x: x + w / 2, y: b4.y + b4.h / 2, size: Math.min(w, b4.h) / 2, color: COLORS.b4Circle });

  // 5. pale, with navy curving up from the bottom left to the top right corner
  const b5 = block(935, 1128);
  page.drawRectangle({ x, y: b5.y, width: w, height: b5.h, color: COLORS.b5 });
  clipTo(page, rectOutline(x, b5.y, w, b5.h));
  page.drawCircle({ x: x + w, y: b5.y, size: b5.h, color: COLORS.b5Navy });
  restore(page);

  // 6. violet, with a thin white arch
  const b6 = block(1128, 1315);
  page.drawRectangle({ x, y: b6.y, width: w, height: b6.h, color: COLORS.b6 });
  clipTo(page, rectOutline(x, b6.y, w, b6.h));
  page.drawCircle({ x: x + w / 2, y: b6.y, size: w * 0.5, borderColor: COLORS.white, borderWidth: 0.9, borderOpacity: 0.75 });
  restore(page);
};

const optionalPng = async (doc, file) => {
  const at = path.join(ASSETS, file);
  return fs.existsSync(at) ? doc.embedPng(fs.readFileSync(at)) : null;
};

// Builds the certificate PDF in memory. `issuedAt` is printed as the issue date, so a certificate made again later
// (GET /api/certificates/:id/pdf) shows the day it was really issued.
const buildCertificatePdf = async (details) => {
  const content = certificateContent(details);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${details.title || "Certificate"}: ${content.name}`);
  doc.setAuthor("Bharattech Origin Pvt. Ltd.");
  const font = {};
  for (const [key, file] of Object.entries(FONT_FILES)) font[key] = await doc.embedFont(fs.readFileSync(path.join(FONTS, file)));
  // parts cut from the company's image (assets/certificate); a certificate still draws if one is missing
  const [logo, columnTop, signature, seal] = await Promise.all(["logo", "column-top", "signature", "seal"].map((name) => optionalPng(doc, `${name}.png`)));

  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLORS.paper });

  // the large faint mark behind the text, cut off by the page (centre and size fitted to the company's image)
  clipTo(page, rectOutline(0, 0, PAGE_W, PAGE_H));
  drawLogoStrokes(page, px(920), top(850), px(850), COLORS.watermark);
  restore(page);

  drawColumn(page, columnTop);

  // "CERTIFICATE" and the type's side words, reading upwards
  const word = "CERTIFICATE";
  const bigSize = sizeFor(font.heavy, word, px(715));
  page.drawText(word, { x: px(120), y: top(1060), size: bigSize, font: font.heavy, color: COLORS.grey, rotate: degrees(90) });
  const sideSize = px(40);
  const sideSpacing = (px(540) - spacedWidth("OF EXPERIENCE", font.regular, sideSize, 0)) / 12;
  const sideLength = spacedWidth(content.sideWords, font.regular, sideSize, sideSpacing);
  drawSpaced(page, content.sideWords, { x: px(188), y: top(715) - sideLength / 2, size: sideSize, font: font.regular, color: COLORS.violetSoft, spacing: sideSpacing, rotate: true });

  // the logo: the mark, "Bharattech" and "ORIGIN", cut from the company's image (its own lettering)
  drawCut(page, logo, CUTS.logo);

  // the statement, the name and its short rule
  const leadSize = px(22);
  drawSpaced(page, content.statement, { x: px(453), y: top(294), size: leadSize, font: font.regular, color: COLORS.body, spacing: (px(333) - spacedWidth(content.statement, font.regular, leadSize, 0)) / (content.statement.length - 1) });
  const right = px(1062);
  const nameSize = Math.min(sizeFor(font.serif, "Dev Bhatt", px(317)), sizeFor(font.serif, content.name, right - px(453)));
  page.drawText(content.name, { x: px(453), y: top(405), size: nameSize, font: font.serif, color: COLORS.ink });
  page.drawRectangle({ x: px(450), y: top(468), width: px(75), height: px(4), color: COLORS.violetText });

  // "has served as {job title}" and "from {date} to {date}"
  const lineSize = px(24);
  const served = "has served as ";
  page.drawText(served, { x: px(455), y: top(547), size: lineSize, font: font.regular, color: COLORS.body });
  const titleX = px(455) + font.regular.widthOfTextAtSize(served, lineSize);
  const titleSize = Math.min(lineSize, sizeFor(font.bold, content.servedAs || " ", right - titleX));
  page.drawText(content.servedAs, { x: titleX, y: top(547), size: titleSize, font: font.bold, color: COLORS.violetText });
  if (content.from) {
    const small = px(20);
    const dateSize = px(22);
    page.drawText("from", { x: px(449), y: top(588), size: small, font: font.regular, color: COLORS.body });
    let x = px(547);
    page.drawText(content.from, { x, y: top(593), size: dateSize, font: font.bold, color: COLORS.violetText });
    x += font.bold.widthOfTextAtSize(content.from, dateSize) + px(40);
    page.drawText("to", { x, y: top(593), size: small, font: font.regular, color: COLORS.body });
    x += font.regular.widthOfTextAtSize("to", small) + px(32);
    page.drawText(content.to, { x, y: top(593), size: dateSize, font: font.bold, color: COLORS.violetText });
  }

  // the two sentences
  const bodySize = sizeFor(font.regular, "During this tenure, the individual has", px(476));
  let line = 645;
  for (const [i, paragraph] of content.paragraphs.entries()) {
    if (i) line += 43;
    for (const text of wrap(font.regular, paragraph, bodySize, right - px(438))) {
      page.drawText(text, { x: px(438), y: top(line), size: bodySize, font: font.regular, color: COLORS.body });
      line += 43;
    }
  }

  // the signatory: the signature, a rule ending in a small arrowhead, name, title and company; the signature and the
  // seal are cut from the company's image (assets/certificate) and sit where they sit there
  drawCut(page, signature, CUTS.signature);
  page.drawLine({ start: { x: px(441), y: top(1012) }, end: { x: px(726), y: top(1012) }, thickness: px(3), color: COLORS.line });
  page.drawSvgPath(`M${px(732)} ${px(1006)} L${px(732)} ${px(1019)} L${px(724)} ${px(1012.5)} Z`, { x: 0, y: PAGE_H, color: COLORS.arrow });
  page.drawText(content.signatory.name, { x: px(444), y: top(1068), size: sizeFor(font.bold, "TUSHAR TRIVEDI", px(220)), font: font.bold, color: COLORS.violetText });
  const roleSize = px(21);
  page.drawText(content.signatory.title, { x: px(444), y: top(1112), size: roleSize, font: font.regular, color: COLORS.body });
  page.drawText(content.signatory.company, { x: px(444), y: top(1145), size: roleSize, font: font.regular, color: COLORS.body });
  drawCut(page, seal, CUTS.seal);

  // the foot: a violet rule, the certificate ID and the issue date
  page.drawLine({ start: { x: px(75), y: top(1326) }, end: { x: px(1045), y: top(1326) }, thickness: px(2), color: COLORS.rule });
  const footSize = px(13);
  const footSpacing = px(1.3);
  const idEnd = drawSpaced(page, "CERTIFICATE ID:", { x: px(75), y: top(1364), size: footSize, font: font.regular, color: COLORS.body, spacing: footSpacing });
  page.drawText(content.id, { x: px(75) + idEnd + px(7), y: top(1364), size: footSize, font: font.bold, color: COLORS.violetText });
  const issuedWidth = font.bold.widthOfTextAtSize(content.issued, footSize);
  page.drawText(content.issued, { x: px(1058) - issuedWidth, y: top(1364), size: footSize, font: font.bold, color: COLORS.violetText });
  drawSpaced(page, "ISSUED ON:", { x: px(862), y: top(1364), size: footSize, font: font.regular, color: COLORS.body, spacing: footSpacing });

  return doc.save();
};

// Saves the PDF under /certificates and returns its path, for clients that open the stored file. Files there don't
// survive a redeploy on hosts with a temporary disk (Render); GET /api/certificates/:id/pdf doesn't depend on them.
const generateCertificate = async (details) => {
  const finalPdf = await buildCertificatePdf(details);
  const cleanName = formatLabel(details.name) || "User";

  const certDir = path.join(__dirname, "../certificates");
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${sanitizeName(cleanName)}.pdf`;
  const outputPath = path.join(certDir, fileName);

  fs.writeFileSync(outputPath, finalPdf);

  return `/certificates/${fileName}`;
};

module.exports = generateCertificate;
module.exports.buildCertificatePdf = buildCertificatePdf;
