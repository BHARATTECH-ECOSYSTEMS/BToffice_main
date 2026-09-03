import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

import {Button, CircularProgress} from "@mui/material"
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Box } from "@mui/material";
import placeholder from '../placeholder.svg';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  Filter,
  Search,
  Grid3X3,
  List
} from 'lucide-react';
import toast, {Toaster} from "react-hot-toast"
import { useEffect, useState } from 'react';
// import Sidebar from '../components/Sidebar'; // Not used here but keep if needed
import axios from "axios"
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Courses = () => {
  const[courses,setCourses] = useState([])
const[search,setSearch] = useState("")
const {user} = useContext(AuthContext)
  useEffect(()=>{
    const fetchCourses = async()=>{
const res = await axios.get("http://localhost:5000/api/courses/all-approved")
setCourses(res.data.courses)
    }
    const fetchEnrolledCourses = async () => {
    const res = await axios.get("http://localhost:5000/api/courses/enrolled", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    setEnrolled(res.data.enrolledCourses);
  };

  fetchEnrolledCourses();
    fetchCourses()


  },[])
const [loading,setLoading] = useState(false)

const[enrolled,setEnrolled] = useState([])

  const handleEnroll = async (id) => {
  try {
    setLoading(true);

    const token = localStorage.getItem("token");

    const res = await axios.post(
      `http://localhost:5000/api/courses/enroll/${id}`,
      {temp:"ok"}, // body empty
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

   toast.success("Enrolled Successsfully...")
    
  } catch (err) {
    alert("Enrolling failed due to " + err.response?.data?.message);
  } finally {
    setLoading(false);
  }
};


  const searched = courses.filter(c=>c.title.toLowerCase().includes(search.toLowerCase()))
  const categories = ["All", "Web Development", "Data Science", "Design", "Marketing", "Business"];

  return (
    <div className="flex flex-col min-h-screen bg-background mt-10 px-4 sm:px-6 lg:px-8">
<Toaster position="top-center"/>
      {/* Header */}
      <Box className="flex flex-col sm:flex-row flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-semibold mb-2 sm:mb-0">All Courses</h1>

        <Box className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {console.log("Enrolled courses are ",enrolled)}
          </Button>
          <Button variant="outline" size="sm">
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <List className="w-4 h-4" />
          </Button>
        </Box>
      </Box>

      {/* Search + Categories */}
      <Box className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-6 justify-between">

        {/* Search Bar */}
       <Box className="relative flex-1 min-w-[180px] max-w-full sm:max-w-md rounded-lg">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
  <input
    type="text"
    placeholder="Search courses..."
    className="border border-gray-400 w-full pl-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
    value={search}
    onChange={(e)=>setSearch(e.target.value)}
  />
</Box>


        {/* Filters */}
        <Box className="flex flex-wrap items-center gap-2 max-w-full justify-center sm:justify-start">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={category === "All" ? "primary" : "secondary"}
              className="cursor-pointer hover:bg-secondary/10"
            >
              {category}
            </Badge>
          ))}
        </Box>
      </Box>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {
          searched.length===0?<Box display={"flex"} justifyContent={"center"} alignItems={"center"}><h1 className='font-lg'>No Items Found....</h1></Box>:
        searched.map((course) => (
          <Card
          style={{
            "&:hover":{
            
            }
          }}
            key={course.id}
            className="border border-gray-300 hover:shadow-lg transition-all duration-300"
          >

            <div className="relative">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-40 sm:h-48 object-cover rounded-t-lg border-0"
              />

              <Badge className="absolute top-3 left-3 text-white">
                {course.courseLevel}
              </Badge>

              {enrolled.some(c => c._id === course._id) && (
  <Badge className="absolute top-3 right-3 bg-gradient-primary text-primary-foreground">
    Enrolled
  </Badge>
)}

            </div>

            <CardHeader className="pb-3">
              <Badge variant="secondary" className="w-fit mb-2">
                {course.category}
              </Badge>
              <CardTitle className="text-sm font-semibold line-clamp-2">
                {course.title}
              </CardTitle>
              <CardDescription className="text-xs">
                by {course.trainer?.email}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {course.rating}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.duration}
                </div>
              </div>

              {course.enrolled && course.progress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>
              )}

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    Rs. {course.price}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {course.originalPrice}
                  </span>
                </div>
                <Button
                onClick={()=>handleEnroll(course._id)}
                  size="sm"
                  variant={course.enrolled ? "secondary" : "default"}
                  className="whitespace-nowrap"
                  sx={{bgcolor:enrolled.some(c=>c._id===course._id)?"green":"hsl(14 100% 50%)", color:"white"}}
                >
                  {loading ?<CircularProgress color='white'/> :enrolled.some(c=>c._id===course._id) ? "Continue" : "Enroll"}
                </Button>
              </div>
            </CardContent>

          </Card>
        ))}
      </div>

    </div>
  );
}

export default Courses;
