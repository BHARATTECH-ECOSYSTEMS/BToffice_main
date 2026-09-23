export const OVERALL_STATS = {
  gpa: 3.8,
  totalCredits: 45,
  completedCourses: 8,
  avgGrade: 89.2
};

export const COURSE_GRADES = [
  {
    id: 1,
    course: "Python for Data Science & Machine Learning",
    instructor: "Sarah Johnson",
    grade: 95,
    credits: 6,
    status: "In Progress",
    assignments: [
      { name: "Data Visualization Project", grade: 98, maxGrade: 100, weight: 30 },
      { name: "Machine Learning Quiz", grade: 92, maxGrade: 100, weight: 20 },
      { name: "Final Project", grade: null, maxGrade: 100, weight: 50 }
    ]
  },
  {
    id: 2,
    course: "UI/UX Design Fundamentals",
    instructor: "Michael Chen",
    grade: 88,
    credits: 4,
    status: "In Progress",
    assignments: [
      { name: "Design Portfolio", grade: 90, maxGrade: 100, weight: 40 },
      { name: "User Research Report", grade: 85, maxGrade: 100, weight: 30 },
      { name: "Prototype Design", grade: null, maxGrade: 100, weight: 30 }
    ]
  },
  {
    id: 3,
    course: "JavaScript Mastery Course",
    instructor: "Alex Rodriguez",
    grade: 92,
    credits: 5,
    status: "Completed",
    assignments: [
      { name: "React Component Library", grade: 95, maxGrade: 100, weight: 35 },
      { name: "JavaScript Fundamentals Test", grade: 88, maxGrade: 100, weight: 25 },
      { name: "Final Web Application", grade: 94, maxGrade: 100, weight: 40 }
    ]
  }
];

export const getGradeColor = (grade) => {
  if (grade >= 90) return 'text-green-600 bg-green-50';
  if (grade >= 80) return 'text-blue-600 bg-blue-50';
  if (grade >= 70) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

export const getGradeText = (grade) => {
  if (grade >= 97) return 'A+';
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A-';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B-';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C-';
  return 'F';
};
