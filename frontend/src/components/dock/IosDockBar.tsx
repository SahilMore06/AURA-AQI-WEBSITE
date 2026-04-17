import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Globe, Activity, MapPin, BarChart3, Settings2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { id: 'home', icon: Globe, label: 'Home', path: '/' },
  { id: 'dashboard', icon: Activity, label: 'Dashboard', path: '/dashboard' },
  { id: 'map', icon: MapPin, label: 'Map', path: '/map' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { id: 'settings', icon: Settings2, label: 'Settings', path: '/settings' },
];

function DockItem({ item, mouseX, isActive, onClick }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute -top-12 px-3 py-1.5 bg-surface/90 backdrop-blur-md border border-stroke text-text-primary text-xs rounded-lg whitespace-nowrap shadow-xl"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={ref}
        style={{ width: size, height: size }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        whileTap={{ scale: 0.9 }}
        className={`relative flex items-center justify-center rounded-full transition-colors ${
          isActive ? 'bg-stroke/50 text-text-primary' : 'bg-transparent text-muted hover:text-text-primary'
        }`}
      >
        <item.icon className={`w-1/2 h-1/2 ${isActive ? 'scale-125' : ''} transition-transform`} />
        
        {isActive && (
          <motion.div
            layoutId="dock-indicator"
            className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#00D4AA] shadow-[0_0_8px_rgba(0,212,170,0.8)]"
          />
        )}
      </motion.button>
    </div>
  );
}

export function IosDockBar() {
  const mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      <div className="flex items-end gap-4 px-4 py-3 bg-surface/80 backdrop-blur-xl border border-stroke rounded-[28px] shadow-2xl">
        {navItems.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            mouseX={mouseX}
            isActive={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </motion.div>
  );
}
