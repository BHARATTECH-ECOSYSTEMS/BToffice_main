// src/components/rightpanel.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Zap, Settings, ExternalLink } from "lucide-react";

const HRMS_LOGIN_URL = "https://hrm.bharat-tech.org/login/";

export default function RightPanel() {
  return (
    <aside className="hidden xl:block w-80 pl-6 pr-4 pt-6">
      {/* HRMS Access Card */}
      <div className="mb-6">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">HRMS Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-gray-600 mb-1">Access your Human Resource Management System</p>
              <p className="text-sm text-gray-500 mb-2">Manage employee records, payroll, and HR processes</p>
              <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs mb-3">HR Management</span>
              <button
                onClick={() => window.open(HRMS_LOGIN_URL, "_blank", "noopener,noreferrer")}
                className="w-full border border-blue-300 px-4 py-2 rounded text-blue-600 flex items-center justify-center gap-2 hover:bg-blue-50 transition"
              >
                <ExternalLink className="w-4 h-4" /> HRMS Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top card */}
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              <Zap className="w-4 h-4 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold">View x Event Limit</div>
                <div className="text-xs mt-1 opacity-90">2250/45000000 • expires 3 days</div>
              </div>
            </div>
            <button className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium py-2 px-3 rounded">
              Learn more
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade button */}
      <div className="mb-6">
        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
          Upgrade plan →
        </Button>
      </div>

      {/* Bottom icons */}
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-8 h-8 rounded-full bg-blue-500" />
        <Settings className="w-5 h-5 text-gray-500" />
      </div>
    </aside>
  );
}
