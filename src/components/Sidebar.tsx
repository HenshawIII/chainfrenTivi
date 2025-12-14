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
import { getSubscribedChannels, getStreamsByCreator, getUserProfile, getUserProfileByUsername, subscribeToCreator } from '@/lib/supabase-service';
import { SupabaseStream, SupabaseUser } from '@/lib/supabase-types';
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
import { toast } from 'sonner';
import { Bars } from 'react-loader-spinner';

interface SidebarProps {
  sidebarCollapsed?: boolean;
  isInstallable?: boolean;
  onInstallClick?: () => void;
}

const Sidebar = ({ sidebarCollapsed, isInstallable, onInstallClick }: SidebarProps) => {
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
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [foundCreator, setFoundCreator] = useState<SupabaseUser | null>(null);
  const [foundChannel, setFoundChannel] = useState<SupabaseStream | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

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
    setShowAddChannelModal(true);
  };

  // Parse URL to extract creator identifier
  const parseCreatorUrl = (url: string): string | null => {
    try {
      // Remove any trailing slashes and whitespace
      const cleanUrl = url.trim().replace(/\/$/, '');
      
      // Match pattern: /creator/[id] or /creator/[id]/
      const match = cleanUrl.match(/\/creator\/([^\/\?]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      
      // If it's just the ID without the full URL, return it
      if (!cleanUrl.includes('/')) {
        return cleanUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  };

  // Validate and fetch creator profile
  const handleValidateUrl = async () => {
    if (!channelUrl.trim()) {
      toast.error('Please enter a channel URL');
      return;
    }

    setIsValidatingUrl(true);
    setFoundCreator(null);
    setFoundChannel(null);

    try {
      const creatorIdentifier = parseCreatorUrl(channelUrl);
      
      if (!creatorIdentifier) {
        toast.error('Invalid URL format. Please use: /creator/[id] or https://origin/creator/[id]');
        setIsValidatingUrl(false);
        return;
      }

      // Try to get user profile by username first, then by wallet address
      let creatorProfile: SupabaseUser | null = null;
      
      try {
        creatorProfile = await getUserProfileByUsername(creatorIdentifier);
      } catch (error) {
        // If username lookup fails, try wallet address
        try {
          creatorProfile = await getUserProfile(creatorIdentifier);
        } catch (err) {
          console.error('Error fetching creator profile:', err);
        }
      }

      if (!creatorProfile) {
        toast.error('Creator profile not found. Please check the URL.');
        setIsValidatingUrl(false);
        return;
      }

      // Get the actual creatorId (wallet address)
      const actualCreatorId = creatorProfile.creatorId;

      // Check if user is trying to subscribe to themselves
      if (currentUserAddress && currentUserAddress.toLowerCase() === actualCreatorId.toLowerCase()) {
        toast.error('You cannot subscribe to your own channel');
        setIsValidatingUrl(false);
        return;
      }

      // Check if already subscribed
      const currentChannels = subscribedChannels.map(ch => ch.creatorId);
      if (currentChannels.includes(actualCreatorId)) {
        toast.error('You are already subscribed to this channel');
        setIsValidatingUrl(false);
        return;
      }

      // Fetch channel details
      const channels = await getStreamsByCreator(actualCreatorId);
      const channel = channels && channels.length > 0 ? channels[0] : null;

      setFoundCreator(creatorProfile);
      setFoundChannel(channel);
      setShowAddChannelModal(false);
      setShowConfirmModal(true);
    } catch (error: any) {
      console.error('Error validating URL:', error);
      toast.error(error.message || 'Failed to validate URL. Please try again.');
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Handle subscription confirmation
  const handleConfirmSubscribe = async () => {
    if (!foundCreator || !currentUserAddress) {
      toast.error('Missing required information');
      return;
    }

    setIsSubscribing(true);
    try {
      await subscribeToCreator(currentUserAddress, foundCreator.creatorId);
      toast.success(`Subscribed to ${foundCreator.displayName || foundChannel?.title || 'channel'}!`);
      
      // Refresh subscribed channels
      const channels = await getSubscribedChannels(currentUserAddress);
      setSubscribedChannels(channels);
      
      // Update username map
      if (foundCreator.displayName) {
        setCreatorIdToUsername(prev => ({
          ...prev,
          [foundCreator!.creatorId]: foundCreator!.displayName!
        }));
      }
      
      // Reset state
      setChannelUrl('');
      setFoundCreator(null);
      setFoundChannel(null);
      setShowConfirmModal(false);
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast.error(error.message || 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
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

      {/* PWA Install Button - Only show on creator profile pages */}
      {!sidebarCollapsed && isInstallable && onInstallClick && (
        <div className="w-full mt-12">
          <button
            onClick={onInstallClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md transition-all duration-200 text-sm font-semibold"
            title="Install as PWA"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Add to Home Screen</span>
          </button>
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

      {/* Add Channel Modal */}
      <AlertDialog open={showAddChannelModal} onOpenChange={setShowAddChannelModal}>
        <AlertDialogContent className="bg-gray-900 border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Add Channel</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Enter the creator profile URL to subscribe to their channel.
              <br />
              Format: <span className="text-yellow-400">/creator/[id]</span> or <span className="text-yellow-400">https://origin/creator/[id]</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isValidatingUrl) {
                  handleValidateUrl();
                }
              }}
              placeholder="e.g., /creator/username or https://example.com/creator/username"
              className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              disabled={isValidatingUrl}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowAddChannelModal(false);
                setChannelUrl('');
              }}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleValidateUrl}
              disabled={isValidatingUrl || !channelUrl.trim()}
              className="bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidatingUrl ? (
                <div className="flex items-center gap-2">
                  <Bars width={14} height={14} color="#000000" />
                  <span>Validating...</span>
                </div>
              ) : (
                'Validate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="bg-gray-900 border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Subscription</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Do you want to subscribe to this channel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {foundCreator && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                {foundChannel?.logo ? (
                  <img
                    src={foundChannel.logo}
                    alt={foundChannel.title || foundChannel.streamName || 'Channel'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : foundCreator.avatar ? (
                  <img
                    src={foundCreator.avatar}
                    alt={foundCreator.displayName || 'Creator'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-teal-500 flex items-center justify-center text-black text-sm font-bold">
                    {((foundCreator.displayName || foundChannel?.title || foundCreator.creatorId)?.slice(0, 2) || '??').toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">
                    {foundChannel?.title || foundChannel?.streamName || foundCreator.displayName || 'Untitled Channel'}
                  </p>
                  {foundCreator.displayName && (
                    <p className="text-gray-400 text-sm">by {foundCreator.displayName}</p>
                  )}
                </div>
              </div>
              {foundChannel?.description && (
                <p className="text-gray-300 text-sm">{foundChannel.description}</p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowConfirmModal(false);
                setFoundCreator(null);
                setFoundChannel(null);
                setChannelUrl('');
              }}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubscribe}
              disabled={isSubscribing}
              className="bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubscribing ? (
                <div className="flex items-center gap-2">
                  <Bars width={14} height={14} color="#000000" />
                  <span>Subscribing...</span>
                </div>
              ) : (
                'Subscribe'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default Sidebar;
