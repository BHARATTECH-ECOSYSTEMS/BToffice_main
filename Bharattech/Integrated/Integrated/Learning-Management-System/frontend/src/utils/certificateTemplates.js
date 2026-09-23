/**
 * HTML template builder for printable certificates
 */
export const getCertificateHTML = (certificateData, options = {}) => {
  const isPrintDialog = Boolean(options.autoPrint);
  const formattedDate = new Date(certificateData.issueDate || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Certificate - ${certificateData.certificateNumber || "Certificate"}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400;500&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Roboto', sans-serif; }
.certificate-wrapper { width: 1122px; height: 793px; margin: auto; overflow: hidden; display: flex; justify-content: center; align-items: center; }
.certificate-container { width: 100%; height: 100%; background: #ffffff; border: 18px solid #ea580c; border-radius: 8px; position: relative; box-shadow: 0 15px 45px rgba(0, 0, 0, 0.15); overflow: hidden; }
.certificate-border { position: absolute; inset: 12px; border: 2.5px solid #7c3aed; border-radius: 4px; pointer-events: none; }
.certificate-content { padding: 45px 55px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; position: relative; z-index: 1; }
.certificate-logo { font-size: 38px; font-weight: 700; color: #ea580c; font-family: 'Playfair Display', serif; }
.certificate-title { font-size: 26px; font-weight: 300; color: #1f2937; letter-spacing: 6px; text-transform: uppercase; margin-top: 6px; }
.certificate-presented { font-size: 17px; color: #6b7280; font-weight: 400; }
.recipient-name { font-size: 46px; font-weight: 700; color: #111827; font-family: 'Playfair Display', serif; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #fdba74; padding-bottom: 8px; }
.certificate-description { font-size: 18px; color: #4b5563; line-height: 1.5; max-width: 750px; }
.course-name { font-size: 24px; font-weight: 600; color: #ea580c; text-transform: uppercase; letter-spacing: 1.5px; }
.certificate-type { display: inline-block; padding: 6px 20px; background: #ea580c; color: white; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.certificate-footer { display: flex; justify-content: space-between; width: 100%; padding: 0 40px; }
.signature-section { text-align: center; flex: 1; }
.signature-line { width: 170px; height: 2px; background: #1f2937; margin: 35px auto 6px; }
.signature-name { font-size: 15px; font-weight: 600; color: #1f2937; }
.signature-title { font-size: 13px; color: #6b7280; }
.issue-date { position: absolute; bottom: 22px; left: 45px; font-size: 13px; color: #6b7280; }
.certificate-number { position: absolute; bottom: 22px; right: 45px; font-size: 13px; color: #6b7280; }
@media print {
    @page { size: A4 landscape; margin: 0; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .certificate-wrapper { zoom: 0.92; }
}
</style>
</head>
<body>
<div class="certificate-wrapper">
    <div class="certificate-container">
        <div class="certificate-border"></div>
        <div class="certificate-content">
            <div>
                <div class="certificate-logo">Bharattech</div>
                <div class="certificate-title">Certificate of ${certificateData.certificateType || "Completion"}</div>
            </div>
            <div class="certificate-presented">This is to certify that</div>
            <div class="recipient-name">${certificateData.recipientName || "Recipient"}</div>
            <div class="certificate-description">has successfully completed the course</div>
            <div class="course-name">${certificateData.courseName || "Course"}</div>
            <div class="certificate-type">${certificateData.certificateType || "Certification"}</div>
            <div class="certificate-footer">
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-name">Dr. Rajesh Kumar</div>
                    <div class="signature-title">CEO & Founder</div>
                </div>
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-name">Priya Sharma</div>
                    <div class="signature-title">Chief Technology Officer</div>
                </div>
            </div>
        </div>
        <div class="issue-date">Issued: ${formattedDate}</div>
        <div class="certificate-number">Certificate No: ${certificateData.certificateNumber || ""}</div>
    </div>
</div>
${isPrintDialog ? `<script>window.onload = function() { setTimeout(function() { window.print(); }, 600); };</script>` : ""}
</body>
</html>`;
};
