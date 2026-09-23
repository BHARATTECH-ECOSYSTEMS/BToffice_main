import React from 'react';
import { Card } from '../ui/Card';
import { Trophy, Target, Award, TrendingUp } from 'lucide-react';

export default function GradeStatsOverview({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 sm:p-6 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-bold">{stats.gpa}</div>
            <div className="text-sm text-muted-foreground mt-1">Overall GPA</div>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-bold">{stats.avgGrade}%</div>
            <div className="text-sm text-muted-foreground mt-1">Average Grade</div>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalCredits}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Credits</div>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-bold">{stats.completedCourses}</div>
            <div className="text-sm text-muted-foreground mt-1">Completed</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
