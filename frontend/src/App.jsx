import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Marquee from "./components/Marquee/Marquee";
import StatsStrip from "./components/StatsStrip/StatsStrip";
import HowItWorks from "./components/HowItWorks/HowItWorks";
import FeaturesGrid from "./components/FeaturesGrid/FeaturesGrid";
import CTASection from "./components/CTASection/CTASection";
import Footer from "./components/Footer/Footer";
import "./styles/global.css";

function App() {
  return (
    <div id="top">
      <Navbar />
      <Hero />
      <Marquee />
      <StatsStrip />
      <HowItWorks />
      <FeaturesGrid />
      <CTASection />
      <Footer />
    </div>
  );
}

export default App;
