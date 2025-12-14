'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getAllStreams } from '@/features/streamAPI';
import StreamsShowcase from '@/components/templates/landing/StreamsShowcase';
import Sidebar from '@/components/Sidebar';
import SidebarBottomLinks from '@/components/SidebarBottomLinks';
import MobileSidebar from '@/components/MobileSidebar';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { ProfileColumn } from '@/components/templates/dashboard/ProfileColumn';
import Logo from '@/components/Logo';
import { LuArrowLeftFromLine, LuArrowRightFromLine } from 'react-icons/lu';
import clsx from 'clsx';
import { ChannelProvider } from '@/context/ChannelContext';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export default function StreamViews() {
  const dispatch = useDispatch<AppDispatch>();
  const { streams, loading } = useSelector((state: RootState) => state.streams);
  const { ready, authenticated } = usePrivy();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Load streams for the showcase
    dispatch(getAllStreams());
    setIsLoading(false);
  }, [dispatch]);

  // Check if we're on mobile screen
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);

      // Automatically collapse the sidebar on mobile
      if (isMobileView) {
        setSidebarCollapsed(true);
      }
    };

    // Initial check
    checkIfMobile();

    // Add event listener
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const toggleSidebar = () => {
    // Only toggle the sidebar if not in mobile view
    if (!isMobile) {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const toggleMobileMenu = () => {
    // Toggle the mobile menu
    setMobileMenuOpen((prev) => !prev);
  };

  return (
    <ChannelProvider>
      <div className="text-white flex h-screen bg-gradient-to-br from-black via-gray-950 to-black font-sans overflow-hidden">
        {/* Sidebar for desktop */}
        <aside
          className={clsx(
            'md:relative z-20 h-full md:block px-4 gap-y-4 transition-all duration-300 ease-in-out border-r border-white/20 flex flex-col bg-white/10 backdrop-blur-sm',
            {
              'w-[100px]': sidebarCollapsed && !isMobile, // Collapsed sidebar for desktop
              'w-72 p-4': !sidebarCollapsed && !isMobile, // Expanded sidebar for desktop
              hidden: isMobile && !mobileMenuOpen,
              block: isMobile && mobileMenuOpen,
            },
          )}
        >
          <div className="flex items-center justify-between py-4 border-b border-white/20">
            {!sidebarCollapsed && (
              <div className="">
                <Logo size="lg" />
              </div>
            )}
            <button onClick={toggleSidebar} className="ml-auto text-gray-300 hover:text-white transition-colors">
              {sidebarCollapsed ? (
                <LuArrowRightFromLine className="h-5 w-5" />
              ) : (
                <LuArrowLeftFromLine className="h-5 w-5" />
              )}
            </button>
          </div>
          <Sidebar sidebarCollapsed={sidebarCollapsed} />
          
          {/* Bottom Links Section - Fixed at bottom of screen */}
          <div className={clsx(
            'fixed bottom-0 left-0 z-30 backdrop-blur-lg border-t border-white/20 transition-all duration-300',
            {
              'w-[100px]': sidebarCollapsed && !isMobile,
              'w-72': !sidebarCollapsed && !isMobile,
              'hidden': isMobile,
            }
          )}>
            <SidebarBottomLinks sidebarCollapsed={sidebarCollapsed} onCreateChannel={() => {}} />
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <MobileSidebar
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={toggleSidebar}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 h-screen overflow-hidden relative">
          <div className="flex-1 flex gap-4 overflow-hidden">
            <div className="flex-1 my-2 ml-2 flex flex-col relative">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto pb-4">
                <Header toggleMenu={toggleMobileMenu} mobileOpen={mobileMenuOpen} />
                <StreamsShowcase streams={streams} loading={loading} />
              </div>
              {/* Bottom Navigation - Fixed at bottom of middle column */}
              <div className="flex-shrink-0 z-10">
                <BottomNav />
              </div>
            </div>
            
            {/* Third Column - Profile Column */}
            <div className="hidden lg:block flex-shrink-0 pt-2 pr-2">
              {ready && authenticated ? (
                // Logged in: Show ProfileColumn component
                <ProfileColumn />
              ) : (
                // Not logged in: Show login prompts
                <div className="w-[400px] p-4 px-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg space-y-4">
                  <div className="text-center space-y-4">
                    {/* Icon */}
                    <div className="flex justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500/30 to-teal-500/30 flex items-center justify-center border-2 border-yellow-400">
                        <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <h3 className="text-white font-semibold text-lg">Join ChainfrenTV</h3>
                      <p className="text-gray-400 text-sm">
                        Sign in to access your profile, manage your content, and interact with creators.
                      </p>
                    </div>

                    {/* Login Button */}
                    <Link
                      href="/auth/login"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black rounded-lg transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In
                    </Link>

                    {/* Additional Info */}
                    <p className="text-gray-500 text-xs mt-4">
                      New to ChainfrenTV? Signing in will create your account automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ChannelProvider>
  );
}