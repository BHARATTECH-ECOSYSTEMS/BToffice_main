/**
 * Certificate PDF Generator Utility
 * Generates and downloads a beautiful certificate as PDF
 */

export const generateCertificatePDF = (certificateData) => {
  // Create a beautiful certificate HTML template
  const certificateHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate - ${certificateData.certificateNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400;500&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .certificate-container {
            width: 1200px;
            height: 850px;
            background: #ffffff;
            border: 20px solid #f97316;
            border-radius: 10px;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .certificate-border {
            position: absolute;
            inset: 10px;
            border: 3px solid #9333ea;
            border-radius: 5px;
        }
        
        .certificate-content {
            padding: 80px 60px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        
        .certificate-header {
            margin-bottom: 40px;
        }
        
        .certificate-logo {
            font-size: 48px;
            font-weight: 700;
            background: linear-gradient(135deg, #f97316, #ea580c, #dc2626);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
            font-family: 'Playfair Display', serif;
        }
        
        .certificate-title {
            font-size: 32px;
            font-weight: 300;
            color: #1f2937;
            letter-spacing: 8px;
            text-transform: uppercase;
            margin-top: 20px;
        }
        
        .certificate-presented {
            font-size: 20px;
            color: #6b7280;
            margin: 40px 0 30px;
            font-weight: 400;
        }
        
        .recipient-name {
            font-size: 56px;
            font-weight: 700;
            color: #1f2937;
            margin: 30px 0;
            font-family: 'Playfair Display', serif;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        
        .certificate-description {
            font-size: 22px;
            color: #4b5563;
            margin: 30px 0;
            font-weight: 400;
            line-height: 1.6;
            max-width: 800px;
        }
        
        .course-name {
            font-size: 28px;
            font-weight: 600;
            color: #f97316;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .certificate-type {
            display: inline-block;
            padding: 8px 24px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: white;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .certificate-footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            width: 100%;
            padding: 0 40px;
        }
        
        .signature-section {
            text-align: center;
            flex: 1;
        }
        
        .signature-line {
            width: 200px;
            height: 2px;
            background: #1f2937;
            margin: 60px auto 10px;
        }
        
        .signature-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .signature-title {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }
        
        .certificate-number {
            position: absolute;
            bottom: 30px;
            right: 60px;
            font-size: 14px;
            color: #9ca3af;
        }
        
        .issue-date {
            position: absolute;
            bottom: 30px;
            left: 60px;
            font-size: 14px;
            color: #9ca3af;
        }
        
        .decorative-element {
            position: absolute;
            opacity: 0.1;
        }
        
        .decorative-element.top-left {
            top: 40px;
            left: 40px;
            font-size: 120px;
            color: #f97316;
        }
        
        .decorative-element.top-right {
            top: 40px;
            right: 40px;
            font-size: 120px;
            color: #9333ea;
        }
        
        .decorative-element.bottom-left {
            bottom: 40px;
            left: 40px;
            font-size: 120px;
            color: #9333ea;
        }
        
        .decorative-element.bottom-right {
            bottom: 40px;
            right: 40px;
            font-size: 120px;
            color: #f97316;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .certificate-container {
                width: 100%;
                height: 100%;
                border: 15px solid #f97316;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="certificate-border"></div>
        <div class="decorative-element top-left">★</div>
        <div class="decorative-element top-right">★</div>
        <div class="decorative-element bottom-left">★</div>
        <div class="decorative-element bottom-right">★</div>
        
        <div class="certificate-content">
            <div class="certificate-header">
                <div class="certificate-logo">Bharattech</div>
                <div class="certificate-title">Certificate of ${certificateData.certificateType}</div>
            </div>
            
            <div class="certificate-presented">This is to certify that</div>
            
            <div class="recipient-name">${certificateData.recipientName}</div>
            
            <div class="certificate-description">
                has successfully completed the course
            </div>
            
            <div class="course-name">${certificateData.courseName}</div>
            
            <div class="certificate-type">${certificateData.certificateType}</div>
            
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
        
        <div class="issue-date">
            Issued: ${new Date(certificateData.issueDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}
        </div>
        
        <div class="certificate-number">
            Certificate No: ${certificateData.certificateNumber}
        </div>
    </div>
    
    <script>
        // Auto-trigger print dialog after a short delay
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;

  // Create a blob with the HTML content
  const blob = new Blob([certificateHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element to trigger download
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.download = `Certificate_${certificateData.certificateNumber}.html`;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
  
  // Open in new window for printing
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
};

/**
 * Alternative method: Generate certificate as downloadable HTML file
 * that opens in browser for printing/saving as PDF
 */
export const downloadCertificateHTML = (certificateData) => {
  const certificateHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Certificate - ${certificateData.certificateNumber}</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@300;400;500&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: white;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* ----- PERFECT A4 LANDSCAPE SIZE ----- */
.certificate-wrapper {
    width: 1122px;
    height: 793px;
    margin: auto;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* ----- MAIN CERTIFICATE ----- */
.certificate-container {
    width: 100%;
    height: 100%;
    background: #ffffff;
    border: 18px solid #f97316;
    border-radius: 10px;
    position: relative;
    overflow: hidden;
}

.certificate-border {
    position: absolute;
    inset: 12px;
    border: 3px solid #9333ea;
    border-radius: 5px;
}

.certificate-content {
    padding: 60px;
    text-align: center;
    font-family: "Roboto", sans-serif;
}

/* Header */
.certificate-logo {
    font-size: 46px;
    font-weight: bold;
    color: #f97316;
    font-family: "Playfair Display", serif;
}

.certificate-title {
    font-size: 26px;
    letter-spacing: 6px;
    margin-top: 15px;
    font-weight: 300;
    color: #1f2937;
    text-transform: uppercase;
}

/* Body */
.certificate-presented {
    margin-top: 40px;
    font-size: 18px;
    color: #6b7280;
}

.recipient-name {
    font-size: 52px;
    font-family: "Playfair Display", serif;
    margin: 25px 0;
    color: #1f2937;
    font-weight: 700;
}

.certificate-description {
    font-size: 20px;
    color: #4b5563;
    margin: 20px 0;
}

.course-name {
    font-size: 26px;
    font-weight: 700;
    color: #f97316;
    margin-top: 10px;
}

.certificate-type {
    margin-top: 20px;
    padding: 7px 22px;
    font-size: 15px;
    background: #f97316;
    color: white;
    border-radius: 25px;
    display: inline-block;
    text-transform: uppercase;
}

/* Footer Section */
.certificate-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 60px;
    padding: 0 50px;
}

.signature-section {
    text-align: center;
}

.signature-line {
    width: 160px;
    height: 2px;
    background: black;
    margin: 40px auto 8px;
}

.signature-name {
    font-size: 16px;
    font-weight: 600;
}

.signature-title {
    font-size: 13px;
    color: #6b7280;
}

.issue-date, .certificate-number {
    font-size: 13px;
    color: #6b7280;
    position: absolute;
    bottom: 25px;
}

.issue-date {
    left: 35px;
}

.certificate-number {
    right: 35px;
}

/* ----- PRINT MODE (Full Page, No Margins) ----- */
@page {
    size: A4 landscape;
    margin: 0;
}

@media print {
    body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
    }
    .certificate-wrapper {
        zoom: 0.92; /* ensures perfect fit in PDF */
    }
}
</style>
</head>

<body>
<div class="certificate-wrapper">
    <div class="certificate-container">

        <div class="certificate-border"></div>

        <div class="certificate-content">
            <div class="certificate-logo">Bharattech</div>

            <div class="certificate-title">
                Certificate of ${certificateData.certificateType || "Completion"}
            </div>

            <div class="certificate-presented">This is to certify that</div>

            <div class="recipient-name">${certificateData.recipientName}</div>

            <div class="certificate-description">
                has successfully completed the course
            </div>

            <div class="course-name">${certificateData.courseName}</div>

            <div class="certificate-type">${certificateData.certificateType}</div>

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

        <div class="issue-date">
            Issued: ${new Date(certificateData.issueDate).toLocaleDateString()}
        </div>

        <div class="certificate-number">
            Certificate No: ${certificateData.certificateNumber}
        </div>
    </div>
</div>

</body>
</html>`;

  // Create blob and download
  const blob = new Blob([certificateHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificate_${certificateData.certificateNumber || 'Certificate'}.html`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Open in new window for viewing/printing
  const newWindow = window.open(url, '_blank');
  
  // Clean up after delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  
  // Auto-trigger print dialog after window loads
  if (newWindow) {
    newWindow.onload = () => {
      setTimeout(() => {
        newWindow.print();
      }, 1000);
    };
  }
};

