import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";
import { Columns, Plus, Search, Filter, MoreVertical, Edit, Trash2 } from "lucide-react";

export default function CMS() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sidebarOpen } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [contentItems, setContentItems] = useState([
    { id: 1, title: "Home Page", type: "Page", status: "Published", lastModified: "2 hours ago", author: "Admin" },
    { id: 2, title: "About Us", type: "Page", status: "Published", lastModified: "1 day ago", author: "Admin" },
    { id: 3, title: "Services Overview", type: "Page", status: "Draft", lastModified: "3 days ago", author: "Admin" },
    { id: 4, title: "Blog Post: AI Trends", type: "Post", status: "Published", lastModified: "5 days ago", author: "Admin" },
    { id: 5, title: "Contact Form", type: "Form", status: "Published", lastModified: "1 week ago", author: "Admin" }
  ]);
  
  const handleCreateContent = () => {
    alert('Create new content - This would open a content editor in a real application');
    // navigate("/cms/create");
  };
  
  const handleEditContent = (itemId) => {
    alert(`Editing content ${itemId} - This would open the content editor`);
    // navigate(`/cms/${itemId}/edit`);
  };
  
  const handleDeleteContent = (itemId) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      setContentItems(contentItems.filter(item => item.id !== itemId));
    }
  };
  
  const handleFilter = () => {
    alert('Filter options - This would open filter modal in a real application');
  };
  
  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || item.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <TopNav />
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`min-h-screen bg-background pt-[86px] transition-all duration-300 ${
        sidebarOpen ? 'lg:pl-[220px]' : 'lg:pl-0'
      }`}>
        <div className="flex flex-col lg:flex-row lg:pr-6">
          <main className="flex-1 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Content Management System</h1>
                <p className="text-gray-600">Manage your website content, pages, and posts</p>
              </div>
              <button 
                onClick={handleCreateContent}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Content
              </button>
            </div>

            {/* Search and Filter Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button 
                    onClick={handleFilter}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Content List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Columns className="w-5 h-5" />
                  All Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Modified</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Author</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContent.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{item.title}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              item.status === "Published" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.lastModified}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.author}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditContent(item.id)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                              <button 
                                onClick={() => handleDeleteContent(item.id)}
                                className="p-2 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}

