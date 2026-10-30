import { BrowserRouter, Routes,Route } from "react-router-dom"
import Courses from "./pages/Courses"
import MyLearning from "./pages/Mylearning"
import Assignments from "./pages/Assignment"
import Grades from "./pages/Grades"
import LiveClasses from "./pages/Liveclasses"
import Instructors from "./pages/Instructors"
import Navigation from "./components/Navbar"
import { Box, useMediaQuery } from "@mui/material"
import Sidebar from "./components/Sidebar"
import { useContext } from "react"
import { UIContext } from "./context/UiContext"
import Login from "./pages/Login"

function App() {
  const isMobile = useMediaQuery('(max-width:768px)')
const{collapsed,setCollapsed} = useContext(UIContext)

  return (
   <BrowserRouter>
  <Box display="flex" flexDirection="column" height="100vh">
    <Navigation />

    <Box display="flex" flex="1" overflow="hidden">
      
      {/* Sidebar */}
      <Box
        width={isMobile ? "0px":!collapsed && "240px"}
        overflow="auto"
        sx={{
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none", // Firefox
        }}
      >
        <Sidebar />
      </Box>

      {/* Page content */}
      <Box
        flex="1"
        overflow="auto"
        sx={{
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        <Routes>
          <Route path="/courses" element={<Courses />} />
        <Route path="/" element={<Login />} />
          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/live" element={<LiveClasses />} />
          <Route path="/instructors" element={<Instructors />} />
        </Routes>
      </Box>

    </Box>
  </Box>
</BrowserRouter>


  )
}

export default App
