import Hero from "../../components/Hero/Hero";
import Marquee from "../../components/Marquee/Marquee";
import StatsStrip from "../../components/StatsStrip/StatsStrip";
import HowItWorks from "../../components/HowItWorks/HowItWorks";
import FeaturesGrid from "../../components/FeaturesGrid/FeaturesGrid";
import DashboardPreview from "../../components/DashboardPreview/DashboardPreview";
import CTASection from "../../components/CTASection/CTASection";

const Landing = () => (
  <div id="top">
    <Hero />
    <Marquee />
    <StatsStrip />
    <HowItWorks />
    <FeaturesGrid />
    <DashboardPreview />
    <CTASection />
  </div>
);

export default Landing;
