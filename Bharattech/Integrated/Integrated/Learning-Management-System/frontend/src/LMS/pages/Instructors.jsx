import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Search, Filter } from 'lucide-react';
import { INSTRUCTORS } from '../components/instructors/instructorsData';
import InstructorCard from '../components/instructors/InstructorCard';
import MyInstructorDetailCard from '../components/instructors/MyInstructorDetailCard';
import OfficeHoursList from '../components/instructors/OfficeHoursList';

export default function Instructors() {
  const [searchTerm, setSearchTerm] = useState("");
  const myInstructors = INSTRUCTORS.slice(0, 2);

  const filteredInstructors = INSTRUCTORS.filter((inst) =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.specializations.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col min-h-screen bg-background mt-4 px-4 sm:px-6 lg:px-8">
      <Tabs defaultValue="all-instructors" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="all-instructors">All Instructors</TabsTrigger>
          <TabsTrigger value="my-instructors">My Instructors</TabsTrigger>
          <TabsTrigger value="office-hours">Office Hours</TabsTrigger>
        </TabsList>

        {/* All Instructors */}
        <TabsContent value="all-instructors" className="space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search instructors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm border border-border"
              />
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 whitespace-nowrap">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInstructors.map((instructor) => (
              <InstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        </TabsContent>

        {/* My Instructors */}
        <TabsContent value="my-instructors" className="space-y-6 mt-4">
          <div className="space-y-6">
            {myInstructors.map((instructor) => (
              <MyInstructorDetailCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        </TabsContent>

        {/* Office Hours */}
        <TabsContent value="office-hours" className="mt-4">
          <OfficeHoursList instructors={myInstructors} />
        </TabsContent>
      </Tabs>
    </div>
  );
}