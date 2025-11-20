'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BsFillBarChartLineFill } from 'react-icons/bs';
import { CiStreamOn } from 'react-icons/ci';
import { FaSackDollar } from 'react-icons/fa6';
import { IoSettings } from 'react-icons/io5';
import { RiEditFill } from 'react-icons/ri';
import { TbHomeFilled } from 'react-icons/tb';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
import { getSubscribedChannels, getStreamsByCreator, getUserProfile } from '@/lib/supabase-service';
import { SupabaseStream } from '@/lib/supabase-types';
import { useChannel } from '@/context/ChannelContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HiPlus } from 'react-icons/hi';

interface SidebarProps {
  sidebarCollapsed?: boolean;
}

const Sidebar = ({ sidebarCollapsed }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { setSelectedChannelId } = useChannel();
  // Check if we're in the dashboard context
  const isInDashboard = pathname?.startsWith('/dashboard');
  const [subscribedChannels, setSubscribedChannels] = useState<SupabaseStream[]>([]);
  const [ownedChannels, setOwnedChannels] = useState<SupabaseStream[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingOwnedChannels, setLoadingOwnedChannels] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [creatorIdToUsername, setCreatorIdToUsername] = useState<Record<string, string>>({});

  // Get current user's wallet address
  // First try to use the login method if it's a wallet, otherwise find a wallet from linked accounts
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

  // Fetch subscribed channels
  useEffect(() => {
    const fetchSubscribedChannels = async () => {
      if (!isLoggedIn || !currentUserAddress) {
        setSubscribedChannels([]);
        return;
      }

      setLoadingChannels(true);
      try {
        const channels = await getSubscribedChannels(currentUserAddress);
        // console.log('channels', channels);
        setSubscribedChannels(channels);
        
        // Fetch usernames for all unique creator IDs
        const uniqueCreatorIds = Array.from(new Set(channels.map(ch => ch.creatorId)));
        const usernameMap: Record<string, string> = {};
        
        await Promise.all(
          uniqueCreatorIds.map(async (creatorId) => {
            try {
              const profile = await getUserProfile(creatorId);
              if (profile?.displayName) {
                usernameMap[creatorId] = profile.displayName;
              }
            } catch (error) {
              console.error(`Failed to fetch username for ${creatorId}:`, error);
            }
          })
        );
        
        setCreatorIdToUsername(usernameMap);
      } catch (error) {
        console.error('Failed to fetch subscribed channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchSubscribedChannels();
  }, [isLoggedIn, currentUserAddress]);

  // Fetch owned channels
  useEffect(() => {
    const fetchOwnedChannels = async () => {
      if (!isLoggedIn || !currentUserAddress) {
        setOwnedChannels([]);
        return;
      }

      setLoadingOwnedChannels(true);
      try {
        const channels = await getStreamsByCreator(currentUserAddress);
        setOwnedChannels(channels);
      } catch (error) {
        console.error('Failed to fetch owned channels:', error);
      } finally {
        setLoadingOwnedChannels(false);
      }
    };

    fetchOwnedChannels();
  }, [isLoggedIn, currentUserAddress, pathname]);

  const handleAddChannel = () => {
    if (!isLoggedIn) {
      setShowSignupModal(true);
      return;
    }
    router.push('/streamviews');
  };

  const handleSignup = () => {
    setShowSignupModal(false);
    router.push('/auth/login');
  };

  const links = [
    { href: '/', icon: TbHomeFilled, text: 'Home' },
    { href: '/dashboard', icon: BsFillBarChartLineFill, text: 'Dashboard' },
    { href: '/dashboard/settings', icon: IoSettings, text: 'Profile' },
  ];

  return (
    <>
      {/* Subscribed Channels Section */}
      {!sidebarCollapsed && (
        <div className="w-full mt-4 backdrop-blur-sm border border-white/20 rounded-lg p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-white font-bold text-sm">Subscribed Channels</h3>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {loadingChannels ? (
              <div className="text-gray-400 text-sm px-2 py-2">Loading...</div>
            ) : !isLoggedIn ? (
              <div className="text-gray-400 text-sm px-2 py-2">Sign in to see channels</div>
            ) : subscribedChannels.length === 0 ? (
              <div className="text-gray-400 text-sm px-2 py-2">No subscribed channels</div>
            ) : (
              subscribedChannels.map((channel) => {
                // Use username if available, otherwise fallback to creatorId (wallet address)
                const profileIdentifier = creatorIdToUsername[channel.creatorId] || channel.creatorId;
                return (
                <Link
                  key={channel.creatorId}
                  href={`/creator/${encodeURIComponent(profileIdentifier)}`}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.title || channel.streamName || 'Channel'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-teal-500 flex items-center justify-center text-black text-xs font-bold">
                      {((channel.title || channel.streamName || channel.creatorId)?.slice(0, 2) || '??').toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-300 text-sm truncate flex-1">
                    {channel.title || channel.streamName || (channel.creatorId?.slice(0, 8) + '...') || 'Untitled Channel'}
                  </span>
                </Link>
                );
              })
            )}
          </div>
          <button
            onClick={handleAddChannel}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black rounded-md transition-all duration-200 text-sm font-semibold"
          >
            <HiPlus className="w-4 h-4" />
            Add Channel
          </button>
        </div>
      )}

      {/* Owned Channels Section */}
      {!sidebarCollapsed && (
        <div className="w-full mt-12 backdrop-blur-sm border border-white/20 rounded-lg p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-white font-bold text-sm">Owned Channels</h3>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {loadingOwnedChannels ? (
              <div className="text-gray-400 text-sm px-2 py-2">Loading...</div>
            ) : !isLoggedIn ? (
              <div className="text-gray-400 text-sm px-2 py-2">Sign in to see channels</div>
            ) : ownedChannels.length === 0 ? (
              <div className="text-gray-400 text-sm px-2 py-2">No owned channels</div>
            ) : (
              ownedChannels.map((channel) => (
                <button
                  key={channel.playbackId}
                  onClick={() => {
                    if (channel.playbackId) {
                      if (isInDashboard) {
                        // If in dashboard, use context to update state
                        setSelectedChannelId(channel.playbackId);
                        console.log('selected channel id', channel.playbackId);
                      } else {
                        // If outside dashboard, navigate to dashboard with channelId
                        router.push(`/dashboard?channelId=${channel.playbackId}`);
                      }
                    } else {
                      if (isInDashboard) {
                        setSelectedChannelId(null);
                      } else {
                        router.push('/dashboard');
                      }
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
                >
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.title || channel.streamName || 'Channel'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-teal-500 flex items-center justify-center text-black text-xs font-bold">
                      {(channel.title || channel.streamName || channel.creatorId?.slice(0, 2) || 'CH').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <span className="text-gray-300 text-sm truncate flex-1">
                    {channel.title || channel.streamName || channel.creatorId?.slice(0, 8) + '...' || 'Untitled Channel'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Collapsed Add Channel Button */}
      {sidebarCollapsed && (
        <div className="w-full mt-4">
          <button
            onClick={handleAddChannel}
            className="w-full flex items-center justify-center p-3 bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black rounded-md transition-all duration-200"
            title="Add Channel"
          >
            <HiPlus className="w-5 h-5" />
          </button>
        </div>
      )}


      {/* Signup Modal */}
      <AlertDialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign In Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to sign in to add channels. Would you like to sign in now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSignupModal(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignup}
              className="bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black"
            >
              Sign In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default Sidebar;
