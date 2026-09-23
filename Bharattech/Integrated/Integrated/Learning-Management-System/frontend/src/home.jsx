import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import HomeHeroSection from "./components/home/HomeHeroSection";
import HomeServicesSection from "./components/home/HomeServicesSection";
import HomeFaqSection from "./components/home/HomeFaqSection";
import HomeFooterSection from "./components/home/HomeFooterSection";

export default function Home() {
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <TopNav />
      <div className="pt-[86px]">
        <HomeHeroSection
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          navigate={navigate}
        />
        <HomeServicesSection navigate={navigate} />
        <HomeFaqSection />
        <HomeFooterSection />
      </div>
    </>
  );
}
