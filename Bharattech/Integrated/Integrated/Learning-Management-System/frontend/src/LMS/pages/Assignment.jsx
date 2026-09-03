import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { 
  FileText, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Calendar,
  Upload,
  Download,
  Eye
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../LMS/context/AuthContext';
import { getTasks, getAssignedTasks } from '../../services/taskService';
import toast, { Toaster } from 'react-hot-toast';
// Sidebar is provided by LMSLayout - no need to import here

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user: authUser, hasRole } = useAuth();

  useEffect(() => {
    loadTasks();
  }, [authUser]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      
      // Get current user info (prefer AuthContext)
      const currentUserEmail = localStorage.getItem("employeeEmail") || 
                localStorage.getItem("internEmail") || 
                localStorage.getItem("userEmail") || "";
      const currentUserRole = (authUser?.role || localStorage.getItem("userRole") || "").toLowerCase();
      
      // Admin and Subadmin see all tasks they created (admin inherits subadmin), others see tasks assigned to them
      let tasks = [];
      if (hasRole(["admin", "subadmin"])) {
        // Fetch all tasks created by Admin/Subadmin
        tasks = await getAssignedTasks();
      } else {
        // Fetch tasks assigned to current user (Employee/Intern)
        tasks = await getTasks();
      }
      
      // Normalize task data
      const allTasks = (Array.isArray(tasks) ? tasks : []).map(task => ({
        id: task._id || task.id,
        _id: task._id || task.id,
        title: task.title,
        description: task.description,
        status: task.status || "pending",
        assignedTo: task.assignedTo?._id || task.assignedTo,
        assignedName: task.assignedTo?.fullName || task.assignedTo?.name || task.assignedTo?.email || "Unknown",
        assignedEmail: task.assignedTo?.email || task.assignedEmail || "",
        assignedRole: (task.assignedTo?.role || task.assignedRole || "").toLowerCase(),
        assignedBy: task.assignedBy?.fullName || task.assignedBy?.name || "Unknown",
        createdBy: task.createdBy || "subadmin",
        dueDate: task.dueDate || task.createdAt,
        projectFile: task.projectFile,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
      
      // For Admin/Subadmin: show all tasks they created (no filtering needed)
      // For Employee/Intern: filter tasks assigned to them
      let filteredTasks = allTasks;
      if (currentUserRole !== "admin" && currentUserRole !== "subadmin") {
        // Filter tasks to only show those assigned to current user
        // Match by email OR by role (if role matches and email is not set)
        filteredTasks = allTasks.filter(task => {
          const taskAssignedEmail = (task.assignedEmail || "").toLowerCase();
          const taskAssignedRole = (task.assignedRole || "").toLowerCase();
          const userEmail = currentUserEmail.toLowerCase();
          
          // Match by email (most specific)
          if (userEmail && taskAssignedEmail === userEmail) {
            return true;
          }
          
          // Match by role (if email doesn't match but role does)
          if (currentUserRole && taskAssignedRole === currentUserRole) {
            return true;
          }
          
          return false;
        });
      }
      
      filteredTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAssignments(filteredTasks);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const submittedAssignments = [
    {
      id: 3,
      title: "React Component Library",
      course: "Advanced React Development",
      submittedDate: "Dec 8, 2024",
      grade: 95,
      maxPoints: 100,
      type: "Project",
      feedback: "Excellent work on component architecture and documentation. Minor improvements needed in accessibility.",
      status: "graded"
    },
    {
      id: 4,
      title: "JavaScript Fundamentals Test",
      course: "JavaScript Mastery Course",
      submittedDate: "Dec 5, 2024",
      grade: 88,
      maxPoints: 100,
      type: "Quiz",
      feedback: "Good understanding of core concepts. Review async/await patterns.",
      status: "graded"
    }
  ];

  const mapStatusToDisplay = (status) => {
    const statusMap = {
      "pending": "Pending",
      "in-progress": "In Progress",
      "completed": "Completed"
    };
    return statusMap[status?.toLowerCase()] || status || "Pending";
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'graded': return 'text-green-600 bg-green-50 border-green-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const pendingTasks = assignments.filter(t => t.status === "pending" || t.status === "in-progress");
  const completedTasks = assignments.filter(t => t.status === "completed");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background overflow-x-hidden">
      <Toaster position="top-center" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Assignments</h1>
        </div>
        
        <Tabs defaultValue="pending" className="space-y-6">
          
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
            <TabsTrigger value="submitted">Completed ({completedTasks.length})</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
          </TabsList>

          
          <TabsContent value="pending" className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-2">
              <Card className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{pendingTasks.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{assignments.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Tasks</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold">{completedTasks.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>
              </Card>
            </div>
           

            <div>
              <h3 className="text-md md:text-lg font-semibold mb-4">Tasks</h3>
              
                    {isLoading && assignments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </Card>
              ) : assignments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {hasRole(["admin", "subadmin"]) ? "No tasks created yet." : "No tasks assigned yet."}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {assignments.map((assignment) => {
                    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
                    const daysLeft = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-[60%]">
                              <CardTitle className="text-sm md:text-base mb-1">{assignment.title}</CardTitle>
                              <CardDescription className="text-xs md:text-sm">
                                  {hasRole(["admin", "subadmin"]) 
                                    ? `Assigned to: ${assignment.assignedName || "Unknown"}`
                                    : `Created by: ${assignment.createdBy === "admin" ? "Admin" : "Subadmin"}`}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className={getStatusColor(assignment.status)}>
                              {mapStatusToDisplay(assignment.status)}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="space-y-3 text-sm md:text-base">
                            <p className="text-xs md:text-sm text-muted-foreground">{assignment.description || "No description"}</p>

                            <div className="flex flex-wrap gap-4 text-xs md:text-sm">
                              {dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span>Due: {dueDate.toLocaleDateString()}</span>
                                </div>
                              )}
                              {daysLeft !== null && daysLeft > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4 text-primary" />
                                  <span className="text-primary font-medium">{daysLeft} days left</span>
                                </div>
                              )}
                              {daysLeft !== null && daysLeft <= 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500 font-medium">Overdue</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2">
                              <div className="flex justify-end items-center flex-wrap gap-2">
                                <Button size="sm" variant={assignment.status === "completed" ? "secondary" : "default"}>
                                  <Upload className="w-4 h-4 mr-1" />
                                  {assignment.status === "completed" ? "Completed" : "Submit"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          
          <TabsContent value="submitted" className="space-y-4">
            <h3 className="text-md md:text-lg font-semibold mb-4">Completed Tasks</h3>
            {completedTasks.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No completed tasks yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {completedTasks.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-sm md:text-base mb-1">{assignment.title}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        {hasRole(["admin", "subadmin"]) 
                          ? `Assigned to: ${assignment.assignedName || "Unknown"}`
                          : `Created by: ${assignment.createdBy === "admin" ? "Admin" : "Subadmin"}`}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={getStatusColor(assignment.status)}>
                        {mapStatusToDisplay(assignment.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-3 text-xs md:text-sm">
                  <div>
                    <span className="text-muted-foreground">Completed: </span>
                    <span>{assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleDateString() : "N/A"}</span>
                  </div>

                  {assignment.description && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium mb-1">Description:</p>
                      <p className="text-muted-foreground">{assignment.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </TabsContent>

        
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle>Grade Overview</CardTitle>
                <CardDescription>Your academic performance across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm md:text-base text-muted-foreground">Detailed grade analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Assignments;
