import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import CareersHeroSection from "./components/careers/CareersHeroSection";
import CareersBenefitsSection from "./components/careers/CareersBenefitsSection";
import CareersJobListSection from "./components/careers/CareersJobListSection";

export default function Careers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  return (
    <>
      <TopNav />
      <div className="min-h-screen bg-white pt-28">
        <CareersHeroSection navigate={navigate} />
        <CareersBenefitsSection />
        <CareersJobListSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          navigate={navigate}
        />
      </div>
    </>
  );
}
