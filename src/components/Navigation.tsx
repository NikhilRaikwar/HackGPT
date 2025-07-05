import { useState, useEffect } from "react";
import { Brain, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { UserDropdown } from "./ui/UserDropdown";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, signInWithGoogle, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (sectionId === 'testimonials') {
      const testimonialSection = document.querySelector('.animate-marquee');
      if (testimonialSection) {
        const yOffset = -100;
        const y = testimonialSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else if (sectionId === 'cta') {
      const ctaSection = document.querySelector('.button-gradient');
      if (ctaSection) {
        const yOffset = -100;
        const y = ctaSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const navItems = [];

  // Only show Features on landing page and when user is not authenticated
  if (location.pathname === '/' && !isAuthenticated) {
    navItems.push({ name: "Features", href: "#features", onClick: () => scrollToSection('features') });
  }

  // Show Dashboard link when authenticated and not on dashboard
  if (isAuthenticated && location.pathname !== '/dashboard') {
    navItems.unshift({
      name: "Dashboard",
      href: "/dashboard",
      onClick: () => navigate('/dashboard')
    });
  }

  return (
    <header
      className={`fixed top-3.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 rounded-full ${
        isScrolled 
          ? "h-14 bg-white/80 backdrop-blur-xl border border-gray-200/50 scale-95 w-[90%] max-w-2xl shadow-lg" 
          : "h-14 bg-white/60 backdrop-blur-sm w-[95%] max-w-3xl border border-gray-200/30"
      }`}
    >
      <div className="mx-auto h-full px-6">
        <nav className="flex items-center justify-between h-full">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">HackGPT</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.onClick) {
                    item.onClick();
                  }
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-all duration-300"
              >
                {item.name}
              </a>
            ))}
            
            {isAuthenticated ? (
              <UserDropdown />
            ) : location.pathname === '/auth' ? (
              <Button 
                onClick={handleBackToHome}
                size="sm"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to Home
              </Button>
            ) : (
              <Button 
                onClick={handleGetStarted}
                size="sm"
                className="button-gradient"
              >
                Get Started
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/20 backdrop-blur-sm border border-gray-200/50">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-white/95 backdrop-blur-xl">
                <div className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-lg text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMobileMenuOpen(false);
                        if (item.onClick) {
                          item.onClick();
                        }
                      }}
                    >
                      {item.name}
                    </a>
                  ))}
                  
                  {isAuthenticated ? (
                    <div className="mt-4">
                      <UserDropdown />
                    </div>
                  ) : location.pathname === '/auth' ? (
                    <Button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleBackToHome();
                      }}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 mt-4"
                    >
                      Back to Home
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleGetStarted();
                      }}
                      className="button-gradient mt-4"
                    >
                      Get Started
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navigation; 