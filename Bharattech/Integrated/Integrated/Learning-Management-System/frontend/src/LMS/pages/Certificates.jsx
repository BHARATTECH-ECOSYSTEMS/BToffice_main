import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Award,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../LMS/context/AuthContext';
import { getMyCertificates, getCertificates } from '../../services/certificateService';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { user: authUser, hasRole } = useAuth();

  useEffect(() => {
    loadCertificates();
  }, [authUser]);

  const loadCertificates = async () => {
    try {
      setIsLoadingCertificates(true);
      
      // Determine user role (prefer AuthContext)
      const userRole = (authUser?.role || localStorage.getItem("userRole") || "").toLowerCase();
      
      // Admin and Subadmin see all certificates, others see only their own
      let userCertificates = [];
      if (hasRole(["admin", "subadmin"])) {
        // Fetch all certificates for Admin and Subadmin
        userCertificates = await getCertificates();
      } else {
        // Fetch certificates for current user (backend filters by user email from token)
        userCertificates = await getMyCertificates();
      }
      
      // Sort by issue date (newest first)
      const sorted = (Array.isArray(userCertificates) ? userCertificates : []).sort((a, b) => {
        const dateA = new Date(a.issueDate || a.createdAt || 0);
        const dateB = new Date(b.issueDate || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setCertificates(sorted);
    } catch (error) {
      console.error('Error loading certificates:', error);
      setCertificates([]);
    } finally {
      setIsLoadingCertificates(false);
    }
  };

  // Filter certificates based on search term
  const filteredCertificates = certificates.filter((cert) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      cert.courseName?.toLowerCase().includes(term) ||
      cert.recipientName?.toLowerCase().includes(term) ||
      cert.certificateNumber?.toLowerCase().includes(term) ||
      cert.certificateType?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-background mt-8 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            {(() => {
                return hasRole(["admin", "subadmin"]) ? "All Certificates" : "My Certificates";
              })()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
              {(() => {
              return hasRole(["admin", "subadmin"]) 
                ? "View and manage all certificates generated in the system"
                : "View and download your earned certificates";
            })()}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      {certificates.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">{certificates.length}</div>
                <div className="text-sm text-muted-foreground">Total Certificates</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {certificates.filter(c => c.status === "Active").length}
                </div>
                <div className="text-sm text-muted-foreground">Active Certificates</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {new Set(certificates.map(c => c.courseName)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique Courses</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search certificates by course name, recipient, or certificate number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm bg-white"
          />
        </div>
      </div>

      {/* Certificates List */}
      <div className="space-y-6">
        {isLoadingCertificates ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading certificates...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredCertificates.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `No certificates found matching "${searchTerm}"` 
                    : "No certificates found. Certificates will appear here once they are generated by an admin."}
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSearchTerm('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCertificates.map((cert) => (
              <Card key={cert.id || cert._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1">{cert.courseName || "Certificate"}</CardTitle>
                        <CardDescription className="text-sm">
                          {cert.recipientName || "Recipient"}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {cert.certificateType || "Completion"}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cert.status === "Active" ? "bg-green-50 text-green-700" : "text-xs"}
                          >
                            {cert.status || "Active"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {cert.fileUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(cert.fileUrl, '_blank')}
                        className="flex-shrink-0"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Certificate Number:</span>
                      <p className="font-mono font-semibold mt-1">{cert.certificateNumber || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issue Date:</span>
                      <p className="font-medium mt-1">
                        {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recipient Email:</span>
                      <p className="font-medium mt-1">{cert.recipientEmail || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;

