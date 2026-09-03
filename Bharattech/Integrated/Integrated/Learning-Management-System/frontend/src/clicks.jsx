import React, { useState } from "react";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";
import { MousePointer, TrendingUp, Clock, Filter, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function Clicks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clickData = [
    { date: "Mon", clicks: 120 },
    { date: "Tue", clicks: 190 },
    { date: "Wed", clicks: 300 },
    { date: "Thu", clicks: 250 },
    { date: "Fri", clicks: 180 },
    { date: "Sat", clicks: 95 },
    { date: "Sun", clicks: 140 }
  ];

  const topLinks = [
    { url: "/dashboard", clicks: 450, percentage: 35 },
    { url: "/about", clicks: 320, percentage: 25 },
    { url: "/services", clicks: 280, percentage: 22 },
    { url: "/contact", clicks: 180, percentage: 14 },
    { url: "/startups", clicks: 50, percentage: 4 }
  ];

  return (
    <>
      <TopNav />
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="min-h-screen bg-background lg:pl-[220px] pt-[86px]">
        <div className="flex flex-col lg:flex-row lg:pr-6">
          <main className="flex-1 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Clicks Analytics</h1>
                <p className="text-gray-600">Track and analyze user clicks on your website</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
                    <p className="text-2xl font-bold">1,275</p>
                    <p className="text-xs text-green-600 mt-1">+12% from last week</p>
                  </div>
                  <MousePointer className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average per Day</p>
                    <p className="text-2xl font-bold">182</p>
                    <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Peak Hour</p>
                    <p className="text-2xl font-bold">2 PM</p>
                    <p className="text-xs text-gray-500 mt-1">Most active time</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </Card>
            </div>

            {/* Clicks Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Clicks Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clickData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Links */}
            <Card>
              <CardHeader>
                <CardTitle>Top Clicked Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topLinks.map((link, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{link.url}</div>
                          <div className="text-xs text-gray-500">{link.clicks} clicks</div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">{link.percentage}%</div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all" 
                          style={{ width: `${link.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}

