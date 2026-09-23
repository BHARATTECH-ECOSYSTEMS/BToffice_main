import React from 'react';
import { Box, Button } from "@mui/material";
import { Badge } from '../ui/Badge';
import { Filter, Search, Grid3X3, List } from 'lucide-react';

export default function CourseFilters({
  search,
  setSearch,
  categories,
  selectedCategory,
  onSelectCategory
}) {
  return (
    <>
      <Box className="flex flex-col sm:flex-row flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-semibold mb-2 sm:mb-0">All Courses</h1>
        <Box className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <List className="w-4 h-4" />
          </Button>
        </Box>
      </Box>

      <Box className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-6 justify-between">
        <Box className="relative flex-1 min-w-[180px] max-w-full sm:max-w-md rounded-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>

        <Box className="flex flex-wrap items-center gap-2 max-w-full justify-center sm:justify-start">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={category === (selectedCategory || "All") ? "primary" : "secondary"}
              className="cursor-pointer hover:bg-secondary/10"
              onClick={() => onSelectCategory && onSelectCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </Box>
      </Box>
    </>
  );
}
