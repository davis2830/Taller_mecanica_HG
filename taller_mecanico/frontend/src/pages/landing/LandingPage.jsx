import React from 'react';
import LandingNavbar from './components/LandingNavbar';
import LandingHero from './components/LandingHero';
import LandingStats from './components/LandingStats';
import LandingServices from './components/LandingServices';
import LandingHowItWorks from './components/LandingHowItWorks';
import LandingPricing from './components/LandingPricing';
import LandingWhyUs from './components/LandingWhyUs';
import LandingContact from './components/LandingContact';
import LandingFooter from './components/LandingFooter';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-root" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <LandingNavbar />
      <LandingHero />
      <LandingStats />
      <LandingServices />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingWhyUs />
      <LandingContact />
      <LandingFooter />
    </div>
  );
}
