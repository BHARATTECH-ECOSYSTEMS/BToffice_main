import React from 'react';
import { Card } from '../ui/Card';
import { BookOpen, Clock, CheckCircle2, Award } from 'lucide-react';

export default function LearningStatsCards({ enrolledCount, totalDuration, completedCount = 1, certificateCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">{enrolledCount}</div>
            <div className="text-sm text-muted-foreground">Enrolled Courses</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-white">
            <Clock className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalDuration} m</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary bg-gradient-primary text-white rounded-lg" />
          </div>
          <div>
            <div className="text-xl font-bold">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center text-white">
            <Award className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{certificateCount}</div>
            <div className="text-sm text-muted-foreground">Certificates</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
