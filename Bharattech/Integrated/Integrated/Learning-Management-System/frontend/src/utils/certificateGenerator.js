import { getCertificateHTML } from "./certificateTemplates";

/**
 * Certificate PDF/Print Generator Utility
 * Generates and downloads a certificate HTML and opens print dialog
 */
export const generateCertificatePDF = (certificateData) => {
  const certificateHTML = getCertificateHTML(certificateData, { autoPrint: true });
  const blob = new Blob([certificateHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `Certificate_${certificateData.certificateNumber || "Certificate"}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const newWindow = window.open(url, "_blank");
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  if (newWindow) {
    newWindow.onload = () => {
      setTimeout(() => {
        newWindow.print();
      }, 800);
    };
  }
};

/**
 * Generate certificate as downloadable HTML file and open in browser
 */
export const downloadCertificateHTML = (certificateData) => {
  const certificateHTML = getCertificateHTML(certificateData, { autoPrint: true });
  const blob = new Blob([certificateHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.download = `Certificate_${certificateData.certificateNumber || "Certificate"}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 500);

  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 600);
    };
  }
};
