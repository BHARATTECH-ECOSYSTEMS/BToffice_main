import React from 'react';
import { Card } from '../ui/Card';
import { FileText, Clock, CheckCircle2 } from 'lucide-react';

export default function AssignmentStatsCards({ pendingCount, totalCount, completedCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-2">
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold">{pendingCount}</div>
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
            <div className="text-xl md:text-2xl font-bold">{totalCount}</div>
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
            <div className="text-xl md:text-2xl font-bold">{completedCount}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
