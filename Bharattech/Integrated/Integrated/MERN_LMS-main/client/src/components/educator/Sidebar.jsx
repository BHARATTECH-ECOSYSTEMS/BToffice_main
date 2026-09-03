import { NavLink } from "react-router-dom";
import { assets } from "../../assets/assets";
import { useAuth } from "../../context/AuthContext";

function Sidebar() {
  const { isEducator } = useAuth();

  if (!isEducator) return null;

  const menuItems = [
    { name: "Dashboard", path: "/educator", icon: assets.home_icon },
    { name: "Add Course", path: "/educator/add-course", icon: assets.add_icon },
    { name: "My Courses", path: "/educator/my-courses", icon: assets.my_course_icon },
    { name: "Student Enrolled", path: "/educator/students-enrolled", icon: assets.person_tick_icon },
  ];

  return (
    <div className="md:w-64 min-h-screen border-r border-gray-200 text-base flex flex-col">
      <div className="flex-1 py-2">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            end={item.path === "/educator"}
            className={({ isActive }) =>
              `flex items-center md:flex-row flex-col md:justify-start justify-center gap-3 py-3.5 md:px-10 ${
                isActive
                  ? "bg-blue-50 border-r-[6px] border-indigo-500"
                  : "border-r-[6px] border-white hover:bg-gray-100"
              }`
            }
          >
            <img src={item.icon} alt={item.name} className="w-6 h-6" />
            <p className="hidden md:block">{item.name}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
