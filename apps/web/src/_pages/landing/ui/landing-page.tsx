import { CtaSection } from './cta-section';
import { FeaturesSection } from './features-section';
import { HeroSection } from './hero-section';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { StepsSection } from './steps-section';

/**
 * The landing at the domain root (UL-153): the promise, the main scenario, the features
 * and the entry points. Everything above the fold renders on the server; the only client
 * islands are the theme switch and the «Зарегистрироваться» button, which decides between the app
 * and the registration — the session is invisible to the server by design.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-app">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <StepsSection />
        <FeaturesSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
