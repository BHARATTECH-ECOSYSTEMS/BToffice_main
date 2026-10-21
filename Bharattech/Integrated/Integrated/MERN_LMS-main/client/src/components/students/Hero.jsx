import { assets } from "../../assets/assets";
import SearchBar from "./SearchBar";

function Hero() {
  return (
    <div className="bharat-hero-bg flex flex-col items-center justify-center w-full md:pt-36 pt-20 pb-20 px-7 md:px-0 space-y-7 text-center">
      <div className="bharat-hero-beams" />
      <h1 className="md:text-home-heading-large text-home-heading-small relative z-10 font-bold text-white max-w-4xl mx-auto">
        Master new skills with courses that{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-blue-200">
          match your ambition
        </span>
        <img
          src={assets.sketch}
          alt="sketch"
          className="lg:block hidden absolute bottom-3 right-36  w-10 "
        />
        <img
          src={assets.sketch}
          alt="sketch"
          className="lg:block hidden absolute bottom-2 right-44 w-4 mr-1"
        />
      </h1>
      <p className="md:block hidden relative z-10 text-white/70 max-w-2xl mx-auto pt-4 mt-1">
        Learn from{" "}
        <span className="text-white font-bold">industry experts</span>, engage
        with <span className="text-white font-bold">interactive content</span>
        , and join a thriving community dedicated to helping you reach your
        career goals <br />
        <span className="text-white font-bold">— at your own pace.</span>
      </p>
      <p className="md:hidden relative z-10 text-white/70 max-w-sm mx-auto">
        We bring together{" "}
        <span className="text-white font-bold">world-class</span> instructors to
        help you achieve your professional{" "}
        <span className="text-white font-bold">goals.</span>
      </p>
      <SearchBar />
    </div>
  );
}

export default Hero;
