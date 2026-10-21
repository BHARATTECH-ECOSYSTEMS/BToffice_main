const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const ORGANIZATION_NAME = "BharatTech Tech Ecosystem Pvt. Ltd.";

const sanitizeName = (value) =>
  String(value || "User")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_");

const formatLabel = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const splitParagraph = (font, text, fontSize, maxWidth) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const nextWidth = font.widthOfTextAtSize(nextLine, fontSize);

    if (nextWidth <= maxWidth || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const drawCenteredText = (page, text, options) => {
  const {
    font,
    size,
    y,
    color,
    maxWidth = null,
    lineHeight = size + 6,
  } = options;

  const pageWidth = page.getWidth();

  if (!maxWidth) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
    return y - lineHeight;
  }

  const lines = splitParagraph(font, text, size, maxWidth);
  let currentY = y;

  lines.forEach((line) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: (pageWidth - lineWidth) / 2,
      y: currentY,
      size,
      font,
      color,
    });
    currentY -= lineHeight;
  });

  return currentY;
};

const getCertificateMeta = ({ title, name, role, organizationName }) => {
  const cleanName = formatLabel(name);
  const cleanRole = formatLabel(role);
  const roleText = cleanRole ? ` as ${cleanRole}` : "";
  const orgName = formatLabel(organizationName) || ORGANIZATION_NAME;

  const metaMap = {
    "Bonafide Certificate": {
      heading: "BONAFIDE CERTIFICATE",
      statement: "This is to certify that",
      body: `${cleanName}${roleText} is currently associated with ${orgName}. This certificate is issued upon request for official and lawful purposes.`,
      footerLabel: "Human Resources",
    },
    "Character Certificate": {
      heading: "CHARACTER CERTIFICATE",
      statement: "This is to certify that",
      body: `${cleanName}${roleText} has been associated with ${orgName} and has maintained good conduct, professionalism, and integrity to the best of our knowledge during the period of association.`,
      footerLabel: "Administration",
    },
    "Transfer Certificate": {
      heading: "TRANSFER CERTIFICATE",
      statement: "This is to certify that",
      body: `${cleanName}${roleText} has been associated with ${orgName}. This certificate is issued on request to support transfer and documentation formalities for official use.`,
      footerLabel: "HR Operations",
    },
    "Course Completion": {
      heading: "COURSE COMPLETION CERTIFICATE",
      statement: "This is proudly presented to",
      body: `${cleanName} has successfully completed the prescribed learning requirements under the training and development initiatives conducted by ${orgName}. This certificate recognizes satisfactory participation and completion.`,
      footerLabel: "Learning & Development",
    },
  };

  return (
    metaMap[title] || {
      heading: String(title || "CERTIFICATE").toUpperCase(),
      statement: "This is to certify that",
      body: `${cleanName} has been issued this certificate by ${orgName}.`,
      footerLabel: "Authorized Department",
    }
  );
};

const generateCertificate = async ({
  name,
  title,
  certificateNumber,
  role,
  email,
  username,
}) => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const fontPath = path.join(__dirname, "../fonts/GreatVibes-Regular.ttf");
  const fontBytes = fs.readFileSync(fontPath);

  const cursiveFont = await pdfDoc.embedFont(fontBytes);
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colors = {
    paper: rgb(0.99, 0.985, 0.97),
    border: rgb(0.96, 0.45, 0.09),
    borderAlt: rgb(0.16, 0.25, 0.55),
    title: rgb(0.10, 0.14, 0.22),
    body: rgb(0.25, 0.29, 0.36),
    muted: rgb(0.43, 0.47, 0.54),
    warmFill: rgb(1, 0.97, 0.93),
  };

  const cleanName = formatLabel(name) || "User";
  const meta = getCertificateMeta({
    title,
    name: cleanName,
    role,
    organizationName: ORGANIZATION_NAME,
  });

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: colors.paper,
  });

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: colors.border,
    borderWidth: 1.5,
  });

  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: colors.borderAlt,
    borderWidth: 0.9,
  });

  page.drawRectangle({
    x: 24,
    y: height - 88,
    width: 180,
    height: 10,
    color: colors.border,
  });

  page.drawRectangle({
    x: width - 204,
    y: height - 88,
    width: 180,
    height: 10,
    color: colors.borderAlt,
  });

  page.drawRectangle({
    x: 24,
    y: 78,
    width: 180,
    height: 10,
    color: colors.borderAlt,
  });

  page.drawRectangle({
    x: width - 204,
    y: 78,
    width: 180,
    height: 10,
    color: colors.border,
  });

  drawCenteredText(page, "BHARATTECH", {
    font: headingFont,
    size: 26,
    y: 526,
    color: colors.title,
  });

  drawCenteredText(page, "TECH ECOSYSTEM PVT. LTD.", {
    font: bodyFont,
    size: 11,
    y: 505,
    color: colors.border,
  });

  page.drawLine({
    start: { x: 250, y: 495 },
    end: { x: 592, y: 495 },
    thickness: 1,
    color: rgb(0.89, 0.89, 0.9),
  });

  drawCenteredText(page, "CERTIFICATE", {
    font: headingFont,
    size: 34,
    y: 448,
    color: colors.title,
  });

  drawCenteredText(page, meta.heading, {
    font: headingFont,
    size: 20,
    y: 410,
    color: colors.body,
  });

  drawCenteredText(page, meta.statement, {
    font: bodyFont,
    size: 16,
    y: 367,
    color: colors.muted,
  });

  let nameFontSize = 42;
  let nameWidth = cursiveFont.widthOfTextAtSize(cleanName, nameFontSize);

  while (nameWidth > width - 220 && nameFontSize > 26) {
    nameFontSize -= 2;
    nameWidth = cursiveFont.widthOfTextAtSize(cleanName, nameFontSize);
  }

  page.drawText(cleanName, {
    x: (width - nameWidth) / 2,
    y: 307,
    size: nameFontSize,
    font: cursiveFont,
    color: colors.title,
  });

  page.drawLine({
    start: { x: 250, y: 300 },
    end: { x: 592, y: 300 },
    thickness: 1,
    color: rgb(0.87, 0.86, 0.84),
  });

  const bodyBottomY = drawCenteredText(page, meta.body, {
    font: bodyFont,
    size: 15,
    y: 258,
    color: colors.body,
    maxWidth: 520,
    lineHeight: 23,
  });

  const referenceText = [email, username].filter(Boolean).join("  |  ");
  if (referenceText) {
    drawCenteredText(page, referenceText, {
      font: bodyFont,
      size: 11,
      y: bodyBottomY - 4,
      color: colors.muted,
      maxWidth: 560,
      lineHeight: 14,
    });
  }

  const issueDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  page.drawRectangle({
    x: 70,
    y: 124,
    width: 220,
    height: 48,
    color: colors.warmFill,
    borderColor: rgb(0.98, 0.85, 0.73),
    borderWidth: 1,
  });

  page.drawRectangle({
    x: width - 290,
    y: 124,
    width: 220,
    height: 48,
    color: colors.warmFill,
    borderColor: rgb(0.98, 0.85, 0.73),
    borderWidth: 1,
  });

  page.drawText("Issued On", {
    x: 88,
    y: 154,
    size: 10,
    font: bodyFont,
    color: colors.muted,
  });

  page.drawText(issueDate, {
    x: 88,
    y: 136,
    size: 14,
    font: headingFont,
    color: colors.title,
  });

  page.drawText("Certificate No.", {
    x: width - 272,
    y: 154,
    size: 10,
    font: bodyFont,
    color: colors.muted,
  });

  const certNumberFontSize = String(certificateNumber || "").length > 24 ? 8.5 : 10;

  page.drawText(String(certificateNumber || ""), {
    x: width - 272,
    y: 136,
    size: certNumberFontSize,
    font: headingFont,
    color: colors.title,
  });

  page.drawLine({
    start: { x: 110, y: 100 },
    end: { x: 280, y: 100 },
    thickness: 1.2,
    color: colors.title,
  });

  page.drawLine({
    start: { x: width - 280, y: 100 },
    end: { x: width - 110, y: 100 },
    thickness: 1.2,
    color: colors.title,
  });

  page.drawText("Authorized Signatory", {
    x: 118,
    y: 78,
    size: 12,
    font: bodyFont,
    color: colors.muted,
  });

  page.drawText(meta.footerLabel, {
    x: width - 245,
    y: 78,
    size: 12,
    font: bodyFont,
    color: colors.muted,
  });

  drawCenteredText(page, ORGANIZATION_NAME, {
    font: bodyFont,
    size: 10,
    y: 48,
    color: colors.muted,
  });

  const finalPdf = await pdfDoc.save();

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
