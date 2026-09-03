import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";
import { FileText, Plus, Search, Eye, Edit, Trash2, BarChart3 } from "lucide-react";

export default function Forms() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formsList, setFormsList] = useState([
    { 
      id: 1, 
      name: "Contact Form", 
      submissions: 45, 
      status: "Active", 
      lastSubmission: "2 hours ago",
      fields: 5
    },
    { 
      id: 2, 
      name: "Newsletter Signup", 
      submissions: 128, 
      status: "Active", 
      lastSubmission: "1 day ago",
      fields: 2
    },
    { 
      id: 3, 
      name: "Feedback Form", 
      submissions: 23, 
      status: "Draft", 
      lastSubmission: "3 days ago",
      fields: 7
    },
    { 
      id: 4, 
      name: "Job Application", 
      submissions: 12, 
      status: "Active", 
      lastSubmission: "5 days ago",
      fields: 10
    }
  ]);
  
  const handleCreateForm = () => {
    alert('Create new form functionality - This would open a form builder in a real application');
    // navigate("/forms/create");
  };
  
  const handleViewForm = (formId) => {
    alert(`Viewing form ${formId} - This would show form details and submissions`);
    // navigate(`/forms/${formId}`);
  };
  
  const handleEditForm = (formId) => {
    alert(`Editing form ${formId} - This would open the form editor`);
    // navigate(`/forms/${formId}/edit`);
  };
  
  const handleDeleteForm = (formId) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      setFormsList(formsList.filter(form => form.id !== formId));
    }
  };
  
  const filteredForms = formsList.filter(form => 
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


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
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Forms</h1>
                <p className="text-gray-600">Create and manage your forms and submissions</p>
              </div>
              <button 
                onClick={handleCreateForm}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Form
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Forms</p>
                    <p className="text-2xl font-bold">{formsList.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                    <p className="text-2xl font-bold">{formsList.reduce((sum, form) => sum + form.submissions, 0)}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Forms</p>
                    <p className="text-2xl font-bold">{formsList.filter(f => f.status === "Active").length}</p>
                  </div>
                  <Eye className="w-8 h-8 text-green-500" />
                </div>
              </Card>
            </div>

            {/* Search Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Forms List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredForms.map((form) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{form.name}</CardTitle>
                        <p className="text-sm text-gray-600">{form.fields} fields</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        form.status === "Active" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {form.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Submissions</span>
                        <span className="font-semibold">{form.submissions}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Submission</span>
                        <span className="text-gray-900">{form.lastSubmission}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <button 
                          onClick={() => handleViewForm(form.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button 
                          onClick={() => handleEditForm(form.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteForm(form.id)}
                          className="p-2 border border-gray-200 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
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

