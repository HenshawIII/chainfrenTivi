'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FaSackDollar } from 'react-icons/fa6';
import { IoNotificationsOutline } from 'react-icons/io5';
import { TbHomeFilled } from 'react-icons/tb';
import { IoSettings } from 'react-icons/io5';
import { X } from 'lucide-react';
import { getUserProfile, getUserProfileByUsername } from '@/lib/supabase-service';

const BottomNav = () => {
  const pathname = usePathname();
  const params = useParams();
  const { user, authenticated, ready } = usePrivy();
  const [isOwnerOnCreatorPage, setIsOwnerOnCreatorPage] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);

  // Get current user's wallet address
  const currentUserAddress = useMemo(() => {
    if (!user?.linkedAccounts || user.linkedAccounts.length === 0) return '';
    
    // Check if primary login method is a wallet
    const firstAccount = user.linkedAccounts[0];
    if (firstAccount.type === 'wallet' && 'address' in firstAccount && firstAccount.address) {
      return firstAccount.address;
    }
    
    // Find a wallet from linked accounts
    const walletAccount = user.linkedAccounts.find((account: any) => account.type === 'wallet' && 'address' in account && account.address);
    if (walletAccount && 'address' in walletAccount && walletAccount.address) {
      return walletAccount.address;
    }
    
    return '';
  }, [user?.linkedAccounts]);

  const isLoggedIn = authenticated && ready && !!currentUserAddress;

  // Check if user is on their own creator profile page
  useEffect(() => {
    const checkIfOwner = async () => {
      // Only check if we're on a creator profile page and user is logged in
      if (!pathname?.startsWith('/creator/') || !isLoggedIn || !currentUserAddress) {
        setIsOwnerOnCreatorPage(false);
        setIsCheckingOwner(false);
        return;
      }

      setIsCheckingOwner(true);
      try {
        // Get creatorId from URL params (could be username or wallet address)
        const creatorIdParam = params?.creatorId as string;
        if (!creatorIdParam) {
          setIsOwnerOnCreatorPage(false);
          setIsCheckingOwner(false);
          return;
        }

        const decodedCreatorId = decodeURIComponent(creatorIdParam);
        
        // Try to get user profile by username first, then by wallet address
        let creatorProfile = null;
        try {
          creatorProfile = await getUserProfileByUsername(decodedCreatorId);
        } catch (error) {
          // If username lookup fails, try wallet address
          try {
            creatorProfile = await getUserProfile(decodedCreatorId);
          } catch (err) {
            console.error('Error fetching creator profile:', err);
          }
        }

        if (creatorProfile) {
          const actualCreatorId = creatorProfile.creatorId;
          setIsOwnerOnCreatorPage(
            currentUserAddress.toLowerCase() === actualCreatorId.toLowerCase()
          );
        } else {
          setIsOwnerOnCreatorPage(false);
        }
      } catch (error) {
        console.error('Error checking owner status:', error);
        setIsOwnerOnCreatorPage(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkIfOwner();
  }, [pathname, params, isLoggedIn, currentUserAddress]);

  // Determine if Settings should be shown
  const shouldShowSettings = useMemo(() => {
    // Show on dashboard
    if (pathname?.startsWith('/dashboard')) {
      return isLoggedIn;
    }
    
    // Show on streamviews
    if (pathname === '/streamviews') {
      return isLoggedIn;
    }
    
    // Show on creator profile if user is the owner
    if (pathname?.startsWith('/creator/')) {
      return isOwnerOnCreatorPage;
    }
    
    return false;
  }, [pathname, isLoggedIn, isOwnerOnCreatorPage]);

  const navItems = [
    {
      name: 'Shop',
      icon: FaSackDollar,
      onClick: () => setShowShopModal(true),
      isModal: true,
    },
    {
      name: 'Notifications',
      href: '/dashboard', // Placeholder - update when notifications page is created
      icon: IoNotificationsOutline,
      isModal: false,
    },
    {
      name: 'Feed',
      icon: TbHomeFilled,
      onClick: () => setShowFeedModal(true),
      isModal: true,
    },
    ...(shouldShowSettings ? [{
      name: 'Settings',
      href: '/dashboard/settings',
      icon: IoSettings,
      isModal: false,
    }] : []),
  ];

  return (
    <>
      <nav className="w-full bg-white/10 backdrop-blur-lg border-t border-white/20 shadow-lg">
        <div className="flex items-center justify-around gap-2 px-4 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isModal && item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 min-w-[60px] flex-1 text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Icon className="w-6 h-6 mb-1 text-gray-300" />
                  <span className="text-xs font-medium text-gray-300">
                    {item.name}
                  </span>
                </button>
              );
            }
            
            return (
              <Link
                key={item.name}
                href={item.href || '#'}
                className="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 min-w-[60px] flex-1 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Icon className="w-6 h-6 mb-1 text-gray-300" />
                <span className="text-xs font-medium text-gray-300">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Shop Modal */}
      <Dialog.Root open={showShopModal} onOpenChange={setShowShopModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-white/20 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <Dialog.Title className="text-white text-2xl font-bold">Shop</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <FaSackDollar className="w-16 h-16 text-yellow-500 mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">Shop Coming Soon</h3>
                <p className="text-gray-400 text-sm">
                  The shop feature is currently under development. Check back soon for exciting updates!
                </p>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Feed Modal */}
      <Dialog.Root open={showFeedModal} onOpenChange={setShowFeedModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-white/20 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <Dialog.Title className="text-white text-2xl font-bold">Feed</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <TbHomeFilled className="w-16 h-16 text-yellow-500 mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2">Feed Coming Soon</h3>
                <p className="text-gray-400 text-sm">
                  The feed feature is currently under development. Check back soon for exciting updates!
                </p>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default BottomNav;

