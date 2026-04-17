import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RotatingEarth from '../components/ui/wireframe-dotted-globe';
import { Wind, Activity, ShieldAlert, Map as MapIcon } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [count, setCount] = useState(0);
  const words = ["Breathe", "Monitor", "Protect"];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 2000;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      setCount(Math.floor(progress * 100));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(onComplete, 400);
      }
    };

    requestAnimationFrame(animate);

    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 700);

    return () => clearInterval(wordInterval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-bg flex flex-col justify-between p-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-xs text-muted uppercase tracking-[0.3em]"
      >
        AURA System
      </motion.div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={wordIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80"
          >
            {words[wordIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-end gap-4">
        <div className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums">
          {String(count).padStart(3, "0")}
        </div>
        <div className="w-full h-[3px] bg-stroke/50 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-full accent-gradient origin-left"
            style={{
              transform: `scaleX(${count / 100})`,
              boxShadow: '0 0 8px rgba(0, 212, 170, 0.35)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
      <div className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 ${scrolled ? 'shadow-md shadow-black/10' : ''}`}>
        <div className="relative group cursor-pointer w-9 h-9 rounded-full p-[2px] accent-gradient">
          <div className="w-full h-full bg-bg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Wind className="w-4 h-4 text-text-primary" />
          </div>
        </div>
        
        <div className="w-px h-5 bg-stroke mx-1 hidden md:block" />
        
        <div className="flex items-center gap-1">
          {["Platform", "Features", "Global Data"].map((link, i) => (
            <a href={`#${link.toLowerCase().replace(' ', '-')}`} key={link} className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-colors ${i === 0 ? 'text-text-primary bg-stroke/50' : 'text-muted hover:text-text-primary hover:bg-stroke/50'}`}>
              {link}
            </a>
          ))}
        </div>

        <div className="w-px h-5 bg-stroke mx-1" />
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="relative group text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-text-primary"
        >
          <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative bg-surface rounded-full backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2">
            Launch App <span>↗</span>
          </div>
        </button>
      </div>
    </nav>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const [roleIndex, setRoleIndex] = useState(0);
  const roles = ["Real-time", "Predictive", "Unified", "Intelligent"];

  useEffect(() => {
    const roleInterval = setInterval(() => {
      setRoleIndex(prev => (prev + 1) % roles.length);
    }, 2000);

    return () => clearInterval(roleInterval);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(".name-reveal", 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }
    )
    .fromTo(".blur-in",
      { opacity: 0, filter: "blur(10px)", y: 20 },
      { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 },
      "-=0.8"
    );
  }, []);

  return (
    <section id="platform" className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-bg z-0" />
      <div className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #00D4AA 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-bg to-transparent z-0" />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse" />
          SYSTEM ONLINE
        </div>
        <h1 className="name-reveal text-7xl md:text-9xl lg:text-[10rem] font-display italic leading-[0.85] tracking-tight text-text-primary mb-6">
          AURA
        </h1>
        <div className="blur-in text-xl md:text-3xl text-text-primary mb-6">
          <span key={roleIndex} className="font-display italic text-[#00D4AA] animate-role-fade-in inline-block">{roles[roleIndex]}</span> Air Quality Intelligence.
        </div>
        <p className="blur-in text-sm md:text-base text-muted max-w-lg mb-12">
          Air-quality Unified Response Application. Protect your health with hyper-local monitoring, AI-driven advisories, and global atmospheric data.
        </p>
        
        <div className="blur-in inline-flex gap-4">
          <button onClick={() => navigate('/dashboard')} className="relative group rounded-full text-sm px-8 py-4 hover:scale-105 transition-transform bg-text-primary text-bg hover:bg-bg hover:text-text-primary">
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            Open Dashboard
          </button>
          <button onClick={() => navigate('/map')} className="relative group rounded-full text-sm px-8 py-4 hover:scale-105 transition-transform border-2 border-stroke bg-bg text-text-primary hover:border-transparent">
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            <div className="relative bg-bg rounded-full w-full h-full flex items-center justify-center">
              Explore Map
            </div>
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">SCROLL</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[#00D4AA] animate-scroll-down" />
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    { title: "Hyper-local Tracking", desc: "Real-time PM2.5, PM10, O3, and NO2 monitoring down to your neighborhood.", icon: MapIcon },
    { title: "AI Health Advisories", desc: "Personalized recommendations based on current conditions and your sensitivity.", icon: ShieldAlert },
    { title: "Predictive Analytics", desc: "7-day forecasting models to help you plan outdoor activities safely.", icon: Activity },
    { title: "Global Network", desc: "Access data from thousands of monitoring stations worldwide.", icon: Wind }
  ];

  return (
    <section id="features" className="bg-bg py-20 md:py-32">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6"
        >
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-px bg-[#00D4AA]" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Capabilities</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Intelligent <span className="font-display italic font-normal text-[#00D4AA]">monitoring</span>
            </h2>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group relative overflow-hidden rounded-3xl border border-stroke bg-surface p-8 hover:border-[#00D4AA]/50 transition-colors">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-[#00D4AA] to-transparent transition-opacity duration-500" />
              <f.icon className="w-10 h-10 text-[#00D4AA] mb-6" />
              <h3 className="text-2xl font-medium mb-3">{f.title}</h3>
              <p className="text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const GlobalData = () => {
  return (
    <section id="global-data" className="bg-bg py-20 border-y border-stroke overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00D4AA]/5 to-transparent pointer-events-none" />
      
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 mb-12 relative z-10 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-8 h-px bg-[#00D4AA]" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">Global Coverage</span>
          <div className="w-8 h-px bg-[#00D4AA]" />
        </div>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Atmospheric <span className="font-display italic font-normal">insights</span>
        </h2>
        <p className="text-muted max-w-lg mx-auto">
          Visualizing real-time air quality indices across major metropolitan areas worldwide.
        </p>
      </div>

      <div className="flex justify-center relative z-0">
        <RotatingEarth width={900} height={700} />
      </div>
    </section>
  );
};

const Footer = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    gsap.to(".marquee-content", {
      xPercent: -50,
      duration: 30,
      ease: "none",
      repeat: -1
    });
  }, []);

  return (
    <footer className="relative bg-bg pt-20 pb-12 overflow-hidden flex flex-col items-center justify-center min-h-[60vh]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#00D4AA]/10 via-bg to-bg z-0" />

      <div className="relative z-10 w-full overflow-hidden mb-16">
        <div className="marquee-content whitespace-nowrap flex text-6xl md:text-9xl font-display italic text-white/5">
          {Array(10).fill("BREATHE BETTER • ").map((text, i) => (
            <span key={i} className="px-4">{text}</span>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center px-4 mb-20">
        <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to track?</h2>
        <button onClick={() => navigate('/dashboard')} className="relative group inline-flex rounded-full text-lg px-10 py-5 bg-white text-black hover:scale-105 transition-transform">
          <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          Launch AURA Dashboard
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 pt-8 text-sm text-muted">
        <div className="flex gap-6">
          <span>© 2026 AURA Systems</span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse" />
          All systems operational
        </div>
      </div>
    </footer>
  );
};

export function Landing() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="bg-bg min-h-screen text-text-primary selection:bg-[#00D4AA]/30">
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Navbar />
          <Hero />
          <Features />
          <GlobalData />
          <Footer />
        </motion.div>
      )}
    </div>
  );
}

