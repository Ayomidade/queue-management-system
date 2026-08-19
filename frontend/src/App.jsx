import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import StatsStrip from "./components/StatsStrip";
import HowItWorks from "./components/HowItWorks";
import FeaturesGrid from "./components/FeaturesGrid";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import "./styles/global.css";

function App() {
  return (
    <div id="top">
      <Navbar />
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <FeaturesGrid />
      <CTASection />
      <Footer />
    </div>
  );
}

export default App;
