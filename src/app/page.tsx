import { Header } from '@/components/layout/header'
import { HeroSection } from '@/components/sections/hero-section'
import { LogosSection } from '@/components/sections/logos-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <LogosSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}