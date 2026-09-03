import React, { useState } from "react";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";
import { GitMerge, Plus, Play, Pause, TrendingUp, Users, Target } from "lucide-react";

export default function SplitTesting() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tests = [
    {
      id: 1,
      name: "Homepage Hero CTA",
      status: "Running",
      variants: 2,
      visitors: 1250,
      conversionRate: 12.5,
      winner: "Variant B"
    },
    {
      id: 2,
      name: "Pricing Page Layout",
      status: "Completed",
      variants: 3,
      visitors: 890,
      conversionRate: 8.3,
      winner: "Variant A"
    },
    {
      id: 3,
      name: "Email Subject Line",
      status: "Draft",
      variants: 2,
      visitors: 0,
      conversionRate: 0,
      winner: "-"
    },
    {
      id: 4,
      name: "Checkout Button Color",
      status: "Running",
      variants: 2,
      visitors: 2100,
      conversionRate: 15.2,
      winner: "Variant A"
    }
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
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Split Testing</h1>
                <p className="text-gray-600">Test different variations to optimize conversions</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                <Plus className="w-4 h-4" />
                Create New Test
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Tests</p>
                    <p className="text-2xl font-bold">{tests.filter(t => t.status === "Running").length}</p>
                  </div>
                  <Play className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Tests</p>
                    <p className="text-2xl font-bold">{tests.length}</p>
                  </div>
                  <GitMerge className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Conversion</p>
                    <p className="text-2xl font-bold">
                      {tests.filter(t => t.status !== "Draft").length > 0
                        ? (tests.filter(t => t.status !== "Draft").reduce((sum, t) => sum + t.conversionRate, 0) / tests.filter(t => t.status !== "Draft").length).toFixed(1)
                        : "0"
                      }%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
            </div>

            {/* Tests List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map((test) => (
                <Card key={test.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{test.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            test.status === "Running" 
                              ? "bg-green-100 text-green-700" 
                              : test.status === "Completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {test.status}
                          </span>
                          <span className="text-xs text-gray-500">{test.variants} variants</span>
                        </div>
                      </div>
                      {test.status === "Running" && (
                        <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                          <Pause className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>Visitors</span>
                        </div>
                        <span className="font-semibold">{test.visitors.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Target className="w-4 h-4" />
                          <span>Conversion Rate</span>
                        </div>
                        <span className="font-semibold">{test.conversionRate}%</span>
                      </div>
                      {test.status !== "Draft" && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Winner</span>
                            <span className="font-semibold text-green-600">{test.winner}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <button className="flex-1 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm">
                          View Details
                        </button>
                        {test.status === "Running" && (
                          <button className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm">
                            Stop Test
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

