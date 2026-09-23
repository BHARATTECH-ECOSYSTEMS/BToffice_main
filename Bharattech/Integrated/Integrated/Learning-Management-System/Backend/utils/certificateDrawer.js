const { rgb } = require("pdf-lib");

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

const drawBordersAndAccents = (page, width, height, colors) => {
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
};

module.exports = {
  ORGANIZATION_NAME,
  sanitizeName,
  formatLabel,
  splitParagraph,
  drawCenteredText,
  getCertificateMeta,
  drawBordersAndAccents,
};
