import React from "react";
import { Award, CheckCircle, Users, Key } from "lucide-react";

export default function AdminStatsCards({
  totalCertificates = 0,
  activeCertificates = 0,
  totalUsers = 0,
  totalResetLinks = 0,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">Total Certificates</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalCertificates}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">Active Certificates</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeCertificates}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">Total Users</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalUsers}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Key className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">Active Reset Links</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalResetLinks}</p>
        </div>
      </div>
    </div>
  );
}
