import { useState, useEffect } from "react";
import { X, Save, Trash2, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { downloadCertificateHTML } from "../utils/certificateGenerator";

export default function CertificateManagementModal({
  certificate,
  isOpen,
  onClose,
  onSave,
  onDelete
}) {
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    certificateType: "Completion",
    courseName: "",
  });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (certificate) {
      setFormData({
        recipientName: certificate.recipientName || "",
        recipientEmail: certificate.recipientEmail || "",
        certificateType: certificate.certificateType || "Completion",
        courseName: certificate.courseName || ""
      });
    } else {
      setFormData({
        recipientName: "",
        recipientEmail: "",
        certificateType: "Completion",
        courseName: "",
      });
    }
  }, [certificate, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.recipientName || !formData.recipientEmail || !formData.courseName) {
      alert("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  const handleDownload = () => {
    if (!certificate) {
      alert("No certificate data available to download");
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // Prepare certificate data for download
      const certificateData = {
        recipientName: certificate.recipientName || formData.recipientName,
        recipientEmail: certificate.recipientEmail || formData.recipientEmail,
        certificateType: certificate.certificateType || formData.certificateType,
        courseName: certificate.courseName || formData.courseName,
        certificateNumber: certificate.certificateNumber || 'TEMP-' + Date.now(),
        issueDate: certificate.issueDate || new Date().toISOString(),
      };
      
      // Generate and download certificate
      downloadCertificateHTML(certificateData);
      
      // Reset loading state after a short delay
      setTimeout(() => {
        setIsDownloading(false);
      }, 2000);
    } catch (error) {
      console.error("Error downloading certificate:", error);
      alert("Failed to download certificate. Please try again.");
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-bold truncate pr-2">
            {certificate ? "Edit Certificate" : "Generate New Certificate"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="recipientName" className="text-xs sm:text-sm font-semibold">
                Recipient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipientName"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                className="mt-1 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <Label htmlFor="recipientEmail" className="text-xs sm:text-sm font-semibold">
                Recipient Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipientEmail"
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                className="mt-1 text-sm sm:text-base"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="certificateType" className="text-xs sm:text-sm font-semibold">
                Certificate Type
              </Label>
              <select
                id="certificateType"
                value={formData.certificateType}
                onChange={(e) => setFormData({ ...formData, certificateType: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Completion">Completion</option>
                <option value="Achievement">Achievement</option>
                <option value="Participation">Participation</option>
                <option value="Excellence">Excellence</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="courseName" className="text-xs sm:text-sm font-semibold">
              Course/Program Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="courseName"
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              className="mt-1 text-sm sm:text-base"
              required
            />
          </div>

          {certificate && (
            <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
              <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">
                <strong>Certificate Number:</strong> {certificate.certificateNumber}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 break-words">
                <strong>Issue Date:</strong> {new Date(certificate.issueDate).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t">
            {certificate ? (
              <Button
                type="submit"
                variant="outline"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Update Certificate</span>
                <span className="sm:hidden">Update</span>
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Generate Certificate</span>
                <span className="sm:hidden">Generate</span>
              </Button>
            )}
            
            {certificate && (
              <>
                <Button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  variant="outline"
                  className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full sm:w-auto"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">
                    {isDownloading ? 'Downloading...' : 'Download Certificate'}
                  </span>
                  <span className="sm:hidden">
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this certificate?")) {
                      onDelete();
                    }
                  }}
                  variant="outline"
                  className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </>
            )}
            
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto sm:ml-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

