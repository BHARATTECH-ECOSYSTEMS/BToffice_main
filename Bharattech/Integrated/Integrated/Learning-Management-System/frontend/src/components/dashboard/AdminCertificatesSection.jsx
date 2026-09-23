import React from "react";
import { Award, Plus, Search, Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export default function AdminCertificatesSection({
  certificates = [],
  searchTerm = "",
  onSearchChange,
  onAddCertificate,
  onEditCertificate,
}) {
  return (
    <Card className="bg-white rounded-xl shadow-sm mb-8">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                Certificate Management
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Manage and generate certificates
              </p>
            </div>
          </div>
          <Button
            onClick={onAddCertificate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            <span className="hidden sm:inline">Generate Certificate</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            placeholder="Search certificates…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 sm:pl-12 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              No Certificates Found
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Try clearing the search or generate a new certificate.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Certificate #</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Recipient</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Course</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Type</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Issue Date</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id || cert._id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 lg:px-6 font-mono font-semibold text-gray-800 text-xs sm:text-sm">
                        {cert.certificateNumber}
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {(cert.recipientName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{cert.recipientName}</p>
                            <p className="text-xs text-gray-500 truncate">{cert.recipientEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-gray-800 text-sm">{cert.courseName}</td>
                      <td className="py-4 px-4 lg:px-6">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{cert.certificateType}</Badge>
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-gray-600 text-sm">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <Badge
                          className={
                            cert.status === "Active"
                              ? "bg-green-100 text-green-700 border border-green-200 text-xs"
                              : "bg-gray-100 text-gray-600 text-xs"
                          }
                        >
                          {cert.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <button
                          onClick={() => onEditCertificate(cert)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {certificates.map((cert) => (
                <div key={cert.id || cert._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(cert.recipientName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{cert.recipientName}</p>
                        <p className="text-xs text-gray-500 truncate">{cert.recipientEmail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onEditCertificate(cert)}
                      className="text-blue-600 hover:text-blue-700 p-2 flex-shrink-0"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Certificate #</span>
                      <span className="text-xs font-mono font-semibold text-gray-800">{cert.certificateNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Course</span>
                      <span className="text-xs font-medium text-gray-800">{cert.courseName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Type</span>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{cert.certificateType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Issue Date</span>
                      <span className="text-xs text-gray-600">{new Date(cert.issueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <Badge
                        className={
                          cert.status === "Active"
                            ? "bg-green-100 text-green-700 border border-green-200 text-xs"
                            : "bg-gray-100 text-gray-600 border border-gray-200 text-xs"
                        }
                      >
                        {cert.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
