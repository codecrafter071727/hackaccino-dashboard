import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import { HoverBorderGradient } from './ui/hover-border-gradient';
import { Button as MovingBorderButton } from './ui/moving-border';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Navbar, 
  NavBody, 
  NavItems, 
  MobileNav, 
  NavbarLogo, 
  NavbarButton, 
  MobileNavToggle, 
  MobileNavMenu, 
} from "./ui/resizable-navbar";
import { cn } from "./lib/utils";
import { Spotlight } from "./ui/spotlight";

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import StudentRegistration from './pages/StudentRegistration';
import RoomAllocation from './pages/RoomAllocation';
import PCODuty from './pages/PCODuty';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './supabaseClient';

// Modal Component for Feature Popups
const FeatureModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      {/* Backdrop with light blur to keep background visible */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Content Container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/10 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body - Scrollable content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Dashboard Home Component
function DashboardHome() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [targetFeature, setTargetFeature] = useState<'Registration' | 'Room Allocation' | 'PCO Assignment' | null>(null);
  const [activeFeatureModal, setActiveFeatureModal] = useState<'Registration' | 'Room Allocation' | 'PCO Assignment' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      try {
        setLoggedInUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Invalid user data', error);
        localStorage.removeItem('staffUser');
      }
    }

    // Check Supabase session for Google Auth
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await verifyAndSetUser(session.user.email, session.user.user_metadata?.full_name);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await verifyAndSetUser(session.user.email, session.user.user_metadata?.full_name);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('staffUser');
        setLoggedInUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifyAndSetUser = async (email: string | undefined, name: string | undefined) => {
    if (!email) return;

    setLoading(true);
    try {
      // Fetch user's duty from staff_assignments table
      const { data: staffData, error: staffError } = await supabase
        .from('staff_assignments')
        .select('*')
        .eq('email', email)
        .single();

      if (staffError || !staffData) {
        console.error('Unauthorized staff member', staffError);
        setError('Your Gmail ID is not authorized to access this dashboard. Please contact the administrator.');
        await supabase.auth.signOut();
        localStorage.removeItem('staffUser');
        setLoggedInUser(null);
        return;
      }

      const userObj = {
        email: email,
        name: name || staffData.name || email.split('@')[0],
        duties: staffData.duty.split(',').map((d: string) => d.trim()),
        id: staffData.id
      };

      localStorage.setItem('staffUser', JSON.stringify(userObj));
      setLoggedInUser(userObj);
      setShowLoginModal(false);

      // Get target feature from session storage or state if available
      const pendingFeature = targetFeature || sessionStorage.getItem('targetFeature');
      if (pendingFeature) {
        if (userObj.duties.includes(pendingFeature)) {
          setActiveFeatureModal(pendingFeature as any);
        } else {
          // Stay on home but show error
          setError(`Access Denied! Your assigned duties are "${staffData.duty}", but you tried to access "${pendingFeature}".`);
          setShowLoginModal(true); // Keep modal open to show error
        }
        sessionStorage.removeItem('targetFeature');
      }
    } catch (err) {
      console.error('Error verifying user', err);
      setError('An error occurred while verifying your access.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log("Starting ultimate logout...");
    try {
      // 1. Clear Supabase session first
      await supabase.auth.signOut({ scope: 'local' });
      
      // 2. Clear all storage types
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Clear all cookies (brute force)
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }

      // 4. Reset React state
      setLoggedInUser(null);
      setActiveFeatureModal(null);
      setShowLoginModal(false);

      console.log("Logout successful, redirecting...");
      
      // 5. Hard reload to root
      window.location.replace('/');
    } catch (err) {
      console.error('Logout error:', err);
      // Fallback: still clear everything and reload
      localStorage.clear();
      window.location.replace('/');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    // Save target feature before redirect
    if (targetFeature) {
      sessionStorage.setItem('targetFeature', targetFeature);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        }
      }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleCardClick = (feature: 'Registration' | 'Room Allocation' | 'PCO Assignment') => {
    // Check if already logged in
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Handle both legacy (duty string) and new (duties array) formats
        const userDuties = user.duties || [user.duty];
        if (userDuties.includes(feature)) {
          setActiveFeatureModal(feature);
        } else {
          alert(`Access Denied! Your assigned duties are "${userDuties.join(', ')}", but you are trying to access "${feature}".`);
        }
      } catch (error) {
        localStorage.removeItem('staffUser');
        setTargetFeature(feature);
        setShowLoginModal(true);
      }
    } else {
      // Not logged in, show modal
      setTargetFeature(feature);
      setShowLoginModal(true);
    }
  };

  const navItems = [
    { name: "Home", link: "/" },
    { name: "Features", link: "#features" },
    { name: "About", link: "#about" },
    { name: "Footer", link: "#footer" },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center font-sans relative overflow-x-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Spotlight
          className="-top-40 left-0 md:left-[10%] md:-top-20"
          fill="#a3ff12"
        />
        
        {/* Grid Background - Restricted to top section */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-[1000px]",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.11)_1px,transparent_1px)]",
          "[mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)]"
        )} />
        
        {/* Radial mask for the grid to give a faded look */}
        <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_50%,black)]" />

        {/* Background Decorative Glows */}
        <div className="absolute top-[-15%] left-[-15%] w-[45%] h-[45%] bg-neon-green/[0.04] rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Navbar */}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          {/* Left: Logo */}
          <div className="flex-1 flex justify-start">
            <NavbarLogo onClick={() => navigate('/')} />
          </div>
          
          {/* Center: Nav Items */}
          <div className="flex-1 flex justify-center">
            <NavItems items={navItems} />
          </div>
          
          {/* Right: Actions */}
          <div className="flex-1 flex justify-end">
            <div className="hidden md:flex items-center gap-4">
              {loggedInUser ? (
                <div className="flex items-center gap-4">
                  {/* Profile Indicator */}
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-2 pr-4 py-1.5 hover:bg-white/10 transition-all cursor-default group">
                    <div className="w-7 h-7 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-xs shadow-[0_0_10px_rgba(163,255,18,0.3)]">
                      {loggedInUser.name ? loggedInUser.name.charAt(0).toUpperCase() : (loggedInUser.email ? loggedInUser.email.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div className="flex flex-col -space-y-0.5">
                      <span className="text-[11px] font-bold text-white tracking-tight">
                        {loggedInUser.name || loggedInUser.email?.split('@')[0] || 'User'}
                      </span>
                      <span className="text-[9px] text-neon-green font-black uppercase tracking-widest opacity-70">
                        {loggedInUser.duties ? loggedInUser.duties.join(' • ') : (loggedInUser.duty || 'Staff')}
                      </span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all group"
                  >
                    <span>Logout</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <NavbarButton variant="secondary" onClick={() => navigate('/admin/login')}>
                  Superadmin
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </NavbarButton>
              )}
            </div>

            {/* Mobile Nav Header (only visible on mobile) */}
            <MobileNav>
              <NavbarLogo onClick={() => navigate('/')} />
              <div className="flex items-center gap-3">
                {loggedInUser && (
                  <div className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-xs border border-white/10">
                    {loggedInUser.name ? loggedInUser.name.charAt(0).toUpperCase() : (loggedInUser.email ? loggedInUser.email.charAt(0).toUpperCase() : 'U')}
                  </div>
                )}
                <MobileNavToggle 
                  isOpen={isMobileMenuOpen} 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                />
              </div>
            </MobileNav>
          </div>
        </NavBody>

        {/* Mobile Nav Menu */}
        <MobileNavMenu isOpen={isMobileMenuOpen}>
          <div className="flex flex-col gap-6">
            {loggedInUser && (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="w-12 h-12 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(163,255,18,0.3)]">
                  {loggedInUser.name ? loggedInUser.name.charAt(0).toUpperCase() : (loggedInUser.email ? loggedInUser.email.charAt(0).toUpperCase() : 'U')}
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold">{loggedInUser.name || loggedInUser.email?.split('@')[0] || 'User'}</span>
                  <span className="text-neon-green text-[10px] font-black uppercase tracking-[0.2em]">{loggedInUser.duties ? loggedInUser.duties.join(' • ') : (loggedInUser.duty || 'Staff')}</span>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-4">
              {navItems.map((item, idx) => (
                <a
                  key={`mobile-link-${idx}`}
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-gray-400 hover:text-neon transition-colors px-1"
                >
                  {item.name}
                </a>
              ))}
            </div>

            <hr className="border-white/10" />
            
            <div className="flex flex-col gap-4">
              {loggedInUser ? (
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              ) : (
                <NavbarButton 
                  variant="secondary" 
                  className="text-sm py-3 border border-white/10 rounded-full w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/admin/login');
                  }}
                >
                  Superadmin Portal
                </NavbarButton>
              )}
            </div>
          </div>
        </MobileNavMenu>
      </Navbar>

      {/* Hero Section */}
      <section className="pt-46 pb-32 px-6 relative z-10 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="flex justify-center mb-8">
            <MovingBorderButton
              borderRadius="9999px"
              className="text-neon text-xs font-bold tracking-wider uppercase px-6 py-2"
              duration={3000}
            >
              All-in-One Hackathon Dashboard
            </MovingBorderButton>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-white mb-8 leading-[0.9]">
            Take control of your <br/>
            hackathon — <span className="text-neon neon-text-glow italic">with clarity</span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-lg mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Hackaccino is the premier Bennett University hackathon, powered by the Computer Society of India (CSI). 
            Everything you need to manage the biggest event, all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <HoverBorderGradient
              as="button"
              onClick={() => handleCardClick('Registration')}
              containerClassName="rounded-full"
              className="group flex items-center justify-center px-8 py-3 leading-none"
            >
              <motion.div
                className="flex items-center"
                whileHover="hover"
                whileTap="tap"
              >
                <motion.div
                  variants={{
                    hover: { x: 5 },
                    tap: { 
                      x: [0, 20, -20, 0],
                      opacity: [1, 0, 0, 1],
                      transition: { duration: 0.4, times: [0, 0.4, 0.6, 1] }
                    }
                  }}
                  className="mr-3"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="group-hover:text-neon transition-colors"
                  >
                    <path d="M12 19l7-7-7-7" />
                    <path d="M5 12h14" />
                  </svg>
                </motion.div>
                <span className="font-medium text-base tracking-tight leading-tight">Get Started Free</span>
              </motion.div>
            </HoverBorderGradient>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <main className="pb-32 px-6 relative z-10 w-full">
        <div className="max-w-6xl mx-auto">
          <div id="features" className="text-center mb-12">
            <span className="text-neon text-xs font-bold tracking-widest uppercase">Features</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold text-white tracking-tight">Everything you need, organized</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">Professional tools to manage registration, rooms, and assignments with clarity and speed.</p>
            <div className="mx-auto mt-6 h-[2px] w-24 bg-[radial-gradient(ellipse_at_center,rgba(163,255,18,0.6)_0%,rgba(163,255,18,0)_70%)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Student Registration Card */}
            <div onClick={() => handleCardClick('Registration')} className="relative rounded-3xl cursor-pointer">
              <div className="relative rounded-3xl p-8 card-glass transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-500/15 text-blue-400 rounded-2xl mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Student Registration</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Register new students, update profiles, and manage student database records securely with real-time sync.
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black font-semibold shadow-[0_0_16px_rgba(163,255,18,0.25)] hover:shadow-[0_0_24px_rgba(163,255,18,0.45)] transition">
                <span>Start Registering</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              </div>
            </div>

            {/* Room Allocation Card */}
            <div onClick={() => handleCardClick('Room Allocation')} className="relative rounded-3xl cursor-pointer">
              <div className="relative rounded-3xl p-8 card-glass transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-amber-500/15 text-amber-400 rounded-2xl mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Room Allocation</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Assign rooms to students, manage dormitory capacity, and view occupancy status across all campus blocks.
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black font-semibold shadow-[0_0_16px_rgba(163,255,18,0.25)] hover:shadow-[0_0_24px_rgba(163,255,18,0.45)] transition">
                <span>Manage Allocation</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              </div>
            </div>

            {/* PCO Assignment Card */}
            <div onClick={() => handleCardClick('PCO Assignment')} className="relative rounded-3xl cursor-pointer">
              <div className="relative rounded-3xl p-8 card-glass transition-all duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-emerald-500/15 text-emerald-400 rounded-2xl mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">PCO Assignment</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Coordinate and assign duties for participants, volunteers, and overall event management for a smooth hackathon.
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black font-semibold shadow-[0_0_16px_rgba(163,255,18,0.25)] hover:shadow-[0_0_24px_rgba(163,255,18,0.45)] transition">
                <span>Assign Duty</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0a0a0a]/60 backdrop-blur-2xl border-t border-white/10 py-8 px-6 relative z-10 overflow-hidden">
        {/* Background Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-900/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {/* Left Section: Logo & Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <path d="M7 11l-2 2 2 2" />
                  <path d="M11 11l2 2-2 2" />
                  <path d="M6 2v2M10 2v2M14 2v2" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Hackaccino</span>
            </div>
            <div className="text-gray-400 text-xs leading-relaxed space-y-1 font-medium opacity-70">
              <p>Bennett University, Plot Nos 8-11, TechZone II,</p>
              <p>Greater Noida 201310, Uttar Pradesh</p>
            </div>
          </div>

          {/* Center Section: Partnership */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 p-3 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20">
                <img src="/src/assets/csi.png" alt="CSI Logo" className="w-full h-full object-contain grayscale brightness-200 opacity-80 group-hover:opacity-100 transition-all duration-300" />
              </div>
              <div className="text-center">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-tight">Bennett</div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-tight">University</div>
              </div>
            </div>
            
            <div className="text-white/10 text-xl font-light">✕</div>

            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="w-16 h-16 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <span className="text-white font-black italic text-2xl tracking-tighter opacity-80 group-hover:opacity-100">genesis</span>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-tight">Student</div>
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] leading-tight">Chapter</div>
              </div>
            </div>
          </div>

          {/* Right Section: Contact & Links */}
          <div className="space-y-4 md:text-right">
            <div className="space-y-2">
              <h3 className="text-white font-bold text-[10px] uppercase tracking-[0.15em] opacity-40">Contact Us</h3>
              <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-gray-400 hover:text-white transition-all group cursor-pointer hover:bg-white/[0.06] hover:border-white/20">
                <FaEnvelope className="text-base group-hover:text-neon-green transition-colors" />
                <span className="text-xs font-medium tracking-tight">contact@hackaccino.in</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold text-[10px] uppercase tracking-[0.15em] opacity-40">Quick Links</h3>
              <ul className="flex flex-col gap-1 text-gray-400 text-[11px] font-medium">
                <li>
                  <a href="#" className="hover:text-neon-green transition-colors flex items-center md:justify-end gap-1 group">
                    About CSI 
                    <span className="text-[10px] transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-neon-green transition-colors flex items-center md:justify-end gap-1 group">
                    Sponsorship Brochure 
                    <span className="text-[10px] transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3 text-gray-600 text-[9px] font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Hackaccino. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Feature Modals */}
      <AnimatePresence>
        {activeFeatureModal === 'Registration' && (
          <FeatureModal 
            isOpen={true} 
            onClose={() => setActiveFeatureModal(null)} 
            title="Student Registration"
          >
            <StudentRegistration isModal={true} />
          </FeatureModal>
        )}
        
        {activeFeatureModal === 'Room Allocation' && (
          <FeatureModal 
            isOpen={true} 
            onClose={() => setActiveFeatureModal(null)} 
            title="Room Allocation"
          >
            <RoomAllocation isModal={true} />
          </FeatureModal>
        )}
        
        {activeFeatureModal === 'PCO Assignment' && (
          <FeatureModal 
            isOpen={true} 
            onClose={() => setActiveFeatureModal(null)} 
            title="PCO Duty Assignment"
          >
            <PCODuty isModal={true} />
          </FeatureModal>
        )}
      </AnimatePresence>

      {/* Staff Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4">
          {/* Backdrop with lighter blur to keep background visible */}
          <div 
            className="absolute inset-0 bg-black/10 backdrop-blur-md"
            onClick={() => { setShowLoginModal(false); setError(''); }}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Inner Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-neon-green/20 to-transparent" />
            
            <button 
              onClick={() => { setShowLoginModal(false); setError(''); }}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-neon-green/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-neon-green/20 shadow-[0_0_30px_rgba(163,255,18,0.1)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Staff Portal</h2>
              <p className="text-gray-400 text-sm leading-relaxed px-4">
                Please sign in with your authorized Gmail to access <span className="text-neon-green font-bold">{targetFeature}</span>
              </p>
            </div>

            <div className="space-y-8 relative z-10">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4.5 bg-white text-black font-black rounded-2xl transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-4 group"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl flex items-center leading-relaxed animate-shake">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              
              <div className="flex flex-col items-center gap-3">
                <div className="h-[1px] w-12 bg-white/10" />
                <p className="text-[10px] text-center text-gray-500 uppercase tracking-[0.2em] font-black opacity-50">
                  Authorized Personnel Only
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/registration" element={<StudentRegistration />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
