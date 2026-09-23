import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, AlertCircle, Upload } from 'lucide-react';
import { getStatusColor, mapStatusToDisplay } from './assignmentUtils';

export default function AssignmentPendingGrid({ assignments, isLoading, hasRole }) {
  if (isLoading && assignments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading tasks...</p>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          {hasRole(["admin", "subadmin"]) ? "No tasks created yet." : "No tasks assigned yet."}
        </p>
      </Card>
    );
  }

  return (
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
  );
}
