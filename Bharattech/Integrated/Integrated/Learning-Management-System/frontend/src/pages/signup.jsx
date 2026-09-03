import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/topnav";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error on input change
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (!form.name || !form.email || !form.password || !form.role) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }

    console.log("email:", form.email, "password:", form.password, "role:", form.role);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Success - redirect to login
      alert("Signup successful! Please login with your credentials.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40 overflow-hidden flex flex-col relative">
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/30 via-orange-100/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange-100/25 via-orange-50/15 to-transparent rounded-full blur-3xl"></div>
      </div>

      <TopNav isScrolled={isScrolled} />

      {/* Signup Container */}
      <div className="flex-1 overflow-hidden relative z-10 flex items-center justify-center p-4">
        <div className="flex flex-col items-center w-full max-w-md">
          <Card className="w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-200/60 rounded-2xl overflow-hidden bg-white/98 backdrop-blur-xl">
            <CardHeader className="text-center pb-4 pt-6 px-6 border-b border-gray-100">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-1.5">
                Create Account
              </CardTitle>
              <CardDescription className="text-gray-500 text-sm">
                Sign up to get started with your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6 pt-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    className="h-11 text-sm border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={handleChange}
                    className="h-11 text-sm border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 text-sm border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                    Select Role
                  </Label>
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full h-11 px-3 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-white"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Subadmin">Subadmin</option>
                    <option value="Employee">Employee</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                {/* Sign Up Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white h-11 text-sm font-bold mt-1 rounded-lg shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </CardContent>

            <div className="text-center text-sm py-4 px-6 border-t border-gray-100 bg-gray-50/50">
              <p className="text-gray-600 mb-2 font-medium">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-orange-500 hover:text-orange-600 font-bold transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;

