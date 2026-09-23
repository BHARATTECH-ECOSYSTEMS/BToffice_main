import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../LMS/context/AuthContext';
import { getTasks, getAssignedTasks } from '../../services/taskService';
import toast, { Toaster } from 'react-hot-toast';
import AssignmentStatsCards from '../components/assignments/AssignmentStatsCards';
import AssignmentPendingGrid from '../components/assignments/AssignmentPendingGrid';
import AssignmentCompletedGrid from '../components/assignments/AssignmentCompletedGrid';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: authUser, hasRole } = useAuth();

  useEffect(() => {
    loadTasks();
  }, [authUser]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const currentUserEmail =
        localStorage.getItem("employeeEmail") ||
        localStorage.getItem("internEmail") ||
        localStorage.getItem("userEmail") || "";
      const currentUserRole = (authUser?.role || localStorage.getItem("userRole") || "").toLowerCase();

      let tasks = [];
      if (hasRole(["admin", "subadmin"])) {
        tasks = await getAssignedTasks();
      } else {
        tasks = await getTasks();
      }

      const allTasks = (Array.isArray(tasks) ? tasks : []).map((task) => ({
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

      let filteredTasks = allTasks;
      if (currentUserRole !== "admin" && currentUserRole !== "subadmin") {
        filteredTasks = allTasks.filter((task) => {
          const taskAssignedEmail = (task.assignedEmail || "").toLowerCase();
          const taskAssignedRole = (task.assignedRole || "").toLowerCase();
          const userEmail = currentUserEmail.toLowerCase();
          if (userEmail && taskAssignedEmail === userEmail) return true;
          if (currentUserRole && taskAssignedRole === currentUserRole) return true;
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

  const pendingTasks = assignments.filter((t) => t.status === "pending" || t.status === "in-progress");
  const completedTasks = assignments.filter((t) => t.status === "completed");

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
            <AssignmentStatsCards
              pendingCount={pendingTasks.length}
              totalCount={assignments.length}
              completedCount={completedTasks.length}
            />

            <div>
              <h3 className="text-md md:text-lg font-semibold mb-4">Tasks</h3>
              <AssignmentPendingGrid
                assignments={assignments}
                isLoading={isLoading}
                hasRole={hasRole}
              />
            </div>
          </TabsContent>

          <TabsContent value="submitted" className="space-y-4">
            <h3 className="text-md md:text-lg font-semibold mb-4">Completed Tasks</h3>
            <AssignmentCompletedGrid
              completedTasks={completedTasks}
              hasRole={hasRole}
            />
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
}
