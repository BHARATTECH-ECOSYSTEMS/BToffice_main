import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

function AdminLanding() {
  const navigate = useNavigate();
  const { isAdmin, switchViewRole } = useAuth();
  const canUseAdminLanding = typeof isAdmin === "function" && isAdmin();

  useEffect(() => {
    if (!canUseAdminLanding) {
      navigate("/");
    }
  }, [canUseAdminLanding, navigate]);

  if (!canUseAdminLanding) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-orange-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl">
        <h1 className="mb-2 text-2xl font-semibold text-gray-800">Enter LMS As</h1>

        <p className="mb-8 text-sm text-gray-500">
          Choose how you want to view the platform
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              switchViewRole("student");
              navigate("/");
            }}
            className="rounded-lg bg-green-500 py-3 font-medium text-white transition hover:bg-green-600"
          >
            Login as Student
          </button>

          <button
            onClick={() => {
              switchViewRole("educator");
              navigate("/educator/dashboard");
            }}
            className="rounded-lg bg-blue-500 py-3 font-medium text-white transition hover:bg-blue-600"
          >
            Login as Educator
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLanding;
