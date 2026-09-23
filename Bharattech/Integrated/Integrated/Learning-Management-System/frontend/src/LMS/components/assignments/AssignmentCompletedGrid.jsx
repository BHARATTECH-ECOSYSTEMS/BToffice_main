import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Eye } from 'lucide-react';
import { getStatusColor, mapStatusToDisplay } from './assignmentUtils';

export default function AssignmentCompletedGrid({ completedTasks, hasRole }) {
  if (completedTasks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No completed tasks yet.</p>
      </Card>
    );
  }

  return (
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
  );
}
