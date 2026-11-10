import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import StudyLoop from "@/components/landing/StudyLoop";
import AITutorSection from "@/components/landing/AITutorSection";
import GamificationSection from "@/components/landing/GamificationSection";
import ProgressSection from "@/components/landing/ProgressSection";
import Testimonials from "@/components/landing/Testimonials";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <FeaturesGrid />
    <StudyLoop />
    <AITutorSection />
    <GamificationSection />
    <ProgressSection />
    <Testimonials />
    <FinalCTA />
    <Footer />
  </div>
);

export default Index;
