'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllStreams } from '@/features/streamAPI';
import { getAssets } from '@/features/assetsAPI';
import { AppDispatch, RootState } from '@/store/store';
import { Stream, Asset } from '@/interfaces';
import { VideoCard } from '@/components/Card/Card';
import image1 from '@/assets/image1.png';
import { Bars } from 'react-loader-spinner';
import { toast } from 'sonner';
import Link from 'next/link';
import { getUserProfile, subscribeToCreator, getSubscribedChannels } from '@/lib/supabase-service';
import { SupabaseUser } from '@/lib/supabase-types';
import { HiPlus } from 'react-icons/hi';
import SectionCard from '@/components/Card/SectionCard';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { PublicStreamCard } from './PublicStreamCard';
import Logo from '@/components/Logo';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
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

interface CreatorProfileData {
  creatorId: string;
  displayName: string;
  bio: string;
  avatar: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  theme: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
  isVerified: boolean;
  totalViews: number;
  totalStreams: number;
  totalVideos: number;
}

interface CreatorProfileProps {
  creatorId: string;
}

export function CreatorProfile({ creatorId }: CreatorProfileProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { streams, loading: streamsLoading, error: streamsError } = useSelector((state: RootState) => state.streams);
  const { assets, loading: assetsLoading, error: assetsError } = useSelector((state: RootState) => state.assets);
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const solanaWalletAddress = useSelector((state: RootState) => state.user.solanaWalletAddress);
  
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribedChannels, setSubscribedChannels] = useState<SupabaseUser[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);

  // Get current user's wallet address
  const currentUserAddress = useMemo(() => {
    if (user?.wallet?.chainType === 'solana' && user?.wallet?.address) {
      return user.wallet.address;
    }
    return solanaWalletAddress || '';
  }, [user?.wallet, solanaWalletAddress]);

  // Check if viewer is the creator
  const isCreator = useMemo(() => {
    if (!currentUserAddress || !creatorId) return false;
    return currentUserAddress.toLowerCase() === creatorId.toLowerCase();
  }, [currentUserAddress, creatorId]);

  // Check if user is logged in
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
        setSubscribedChannels(channels);
      } catch (error) {
        console.error('Failed to fetch subscribed channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchSubscribedChannels();
  }, [isLoggedIn, currentUserAddress]);

  const handleAddChannel = () => {
    if (!isLoggedIn) {
      setShowAddChannelModal(true);
      return;
    }
    router.push('/streamviews');
  };

  const handleAddChannelSignup = () => {
    setShowAddChannelModal(false);
    router.push('/dashboard');
  };

  // Fetch creator profile data
  useEffect(() => {
    const fetchCreatorProfile = async () => {
      try {
        setLoading(true);
        const supabaseUser = await getUserProfile(creatorId);
        
        if (supabaseUser) {
          // Convert socialLinks array to object format
          const socialLinksObj: CreatorProfileData['socialLinks'] = {};
          supabaseUser.socialLinks?.forEach((link) => {
            if (link.includes('twitter.com') || link.includes('x.com')) {
              socialLinksObj.twitter = link;
            } else if (link.includes('instagram.com')) {
              socialLinksObj.instagram = link;
            } else if (link.includes('youtube.com')) {
              socialLinksObj.youtube = link;
            } else {
              socialLinksObj.website = link;
            }
          });

          // Convert Supabase format to CreatorProfileData
          const profileData: CreatorProfileData = {
            creatorId: supabaseUser.creatorId,
            displayName: supabaseUser.displayName || '',
            bio: supabaseUser.bio || '',
            avatar: supabaseUser.avatar || '',
            socialLinks: socialLinksObj,
            theme: {
              backgroundColor: '#ffffff',
              textColor: '#000000',
              accentColor: '#0000ff',
            },
            isVerified: false,
            totalViews: 0,
            totalStreams: 0,
            totalVideos: 0,
          };
          setCreatorProfile(profileData);
        } else {
          setError('Profile not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch creator profile');
        toast.error('Failed to load creator profile');
      } finally {
        setLoading(false);
      }
    };

    if (creatorId) {
      fetchCreatorProfile();
    }
  }, [creatorId]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Page URL copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  // Fetch streams and assets for this creator
  useEffect(() => {
    if (creatorId) {
      dispatch(getAllStreams());
      dispatch(getAssets());
    }
  }, [dispatch, creatorId]);

  // Filter streams and assets for this creator
  const creatorStreams = streams.filter((stream: Stream) => 
    stream.creatorId?.value === creatorId && !!stream.playbackId
  );

// console.log('creatorStreams', creatorStreams);

  const creatorAssets = assets.filter((asset: Asset) => 
    asset.creatorId?.value === creatorId && !!asset.playbackId
  );

  // Handle errors
  useEffect(() => {
    if (streamsError) {
      toast.error('Failed to fetch streams: ' + streamsError);
    }
    if (assetsError) {
      toast.error('Failed to fetch assets: ' + assetsError);
    }
  }, [streamsError, assetsError]);

  // useEffect(() => {
  //   console.log('creatorProfile', creatorProfile);
  // }, [creatorProfile]);

  // Creator Profile Sidebar Component
  const CreatorProfileSidebar = () => {
    return (
      <>
        <nav className="w-full mt-2 backdrop-blur-sm border border-white/20 rounded-lg p-2">
          <div className="flex flex-col gap-2">
            <Link href={`/creator/${creatorId}`}>
              <div className="flex items-center rounded-md py-3 gap-3 px-4 transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                <svg className="inline-block h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <p className="font-bold">Profile</p>
              </div>
            </Link>
            <Link href={`/creator/${creatorId}#streams`}>
              <div className="flex items-center rounded-md py-3 gap-3 px-4 transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-white/20">
                <svg className="inline-block h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <p className="font-bold">Streams</p>
              </div>
            </Link>
            <Link href={`/creator/${creatorId}#videos`}>
              <div className="flex items-center rounded-md py-3 gap-3 px-4 transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-white/20">
                <svg className="inline-block h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <p className="font-bold">Videos</p>
              </div>
            </Link>
          </div>
        </nav>

        {/* Subscribed Channels Section */}
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
              subscribedChannels.map((channel) => (
                <Link
                  key={channel.creatorId}
                  href={`/creator/${channel.creatorId}`}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  {channel.avatar ? (
                    <img
                      src={channel.avatar}
                      alt={channel.displayName || 'Channel'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {(channel.displayName || channel.creatorId.slice(0, 2)).toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-300 text-sm truncate flex-1">
                    {channel.displayName || channel.creatorId.slice(0, 8) + '...'}
                  </span>
                </Link>
              ))
            )}
          </div>
          <button
            onClick={handleAddChannel}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-md transition-all duration-200 text-sm font-semibold"
          >
            <HiPlus className="w-4 h-4" />
            Add Channel
          </button>
        </div>
      </>
    );
  };

  if (loading) {
    return <CreatorProfileLoading />;
  }

  if (error || !creatorProfile) {
    console.log('error', error);
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Creator Not Found</h2>
          <p className="text-gray-300">This creator profile does not exist or is private.</p>
        </div>
      </div>
    );
  }

  const toggleMobileMenu = () => setMobileMenuOpen((x) => !x);

  // Handle subscribe action
  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      setShowSignupModal(true);
      return;
    }

    if (!currentUserAddress) {
      toast.error('Wallet address not found');
      return;
    }

    setIsSubscribing(true);
    try {
      await subscribeToCreator(currentUserAddress, creatorId);
      toast.success(`Subscribed to ${creatorProfile?.displayName || 'creator'}!`);
    } catch (err: any) {
      console.error('Subscribe error:', err);
      toast.error(err.message || 'Failed to subscribe');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Handle signup redirect
  const handleSignup = () => {
    setShowSignupModal(false);
    router.push('/dashboard');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 transition-opacity bg-black bg-opacity-50" onClick={toggleMobileMenu} />
      )}
      <aside
        className={clsx(
          'fixed px-4 inset-y-0 left-0 z-30 w-72 bg-gray-900/95 backdrop-blur-sm border-r border-white/20 shadow-md transform transition-transform duration-500 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'md:hidden',
        )}
      >
        <div className="pl-4 flex justify-between items-center">
          <div className="py-6 font-bold uppercase text-white">
            <h1>Creator Profile</h1>
          </div>
          <button onClick={toggleMobileMenu} className="md:hidden">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        <CreatorProfileSidebar />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 px-4 shadow-md">
        <div className="pl-4 flex justify-between items-center">
          <div className="py-6 font-bold uppercase text-white">
            <h1>Creator Profile</h1>
          </div>
        </div>
        <CreatorProfileSidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 h-screen overflow-auto">
        <div className="flex-1 my-2 ml-2 pb-8">
          {/* Header */}
          <header className="flex-1 w-full z-10 top-0 right-0 transition-all shadow-md duration-300 ease-in-out">
            <div className="flex justify-between items-center p-2 sm:p-5 bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
              <div className="flex items-center w-full flex-1 gap-3">
                <button onClick={toggleMobileMenu} className="md:hidden">
                  {mobileMenuOpen ? <X className="h-7 w-7 text-white" /> : <Menu className="h-7 w-7 text-white" />}
                </button>
                <div className="rounded-md">
                  {/* <h1 className="text-md sm:text-lg font-bold text-white">{creatorProfile?.displayName || 'Creator Profile'}</h1> */}
                  <Logo size="lg" />
                </div>
              </div>
              {/* Subscribe Button - Only show if viewer is not the creator */}
              {!isCreator && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                  >
                    {isSubscribing ? (
                      <>
                        <Bars width={16} height={16} color="#ffffff" />
                        <span className="hidden sm:inline">Subscribing...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="hidden sm:inline">Subscribe</span>
                        <span className="sm:hidden">Sub</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Signup Modal for Subscribe */}
          <AlertDialog open={showSignupModal} onOpenChange={setShowSignupModal}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Up Required</AlertDialogTitle>
                <AlertDialogDescription>
                  You need to sign up and connect your wallet to subscribe to creators. Would you like to sign up now?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowSignupModal(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignup} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Sign Up
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Signup Modal for Add Channel */}
          <AlertDialog open={showAddChannelModal} onOpenChange={setShowAddChannelModal}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Up Required</AlertDialogTitle>
                <AlertDialogDescription>
                  You need to sign up and connect your wallet to add channels. Would you like to sign up now?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowAddChannelModal(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddChannelSignup} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Sign Up
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Creator Info Card */}
          <SectionCard title="">
            <div className="col-span-full w-full flex flex-col md:flex-row items-center justify-between gap-4 p-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative">
                  <img
                    src={creatorProfile?.avatar || '/assets/images/default-avatar.png'}
                    alt={creatorProfile?.displayName}
                    className="w-20 h-20 rounded-full object-cover border-4"
                    style={{ borderColor: creatorProfile?.theme?.accentColor || '#8b5cf6' }}
                  />
                  {creatorProfile?.isVerified && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{creatorProfile?.displayName}</h1>
                  <p className="text-lg text-gray-300 mt-2">{creatorProfile?.bio}</p>
                </div>
              </div>
              
              {/* Social Links */}
              <div className="flex space-x-3">
                {creatorProfile?.socialLinks?.twitter && (
                  <a
                    href={creatorProfile?.socialLinks?.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-opacity-20 transition-colors bg-white/10"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                )}
                {creatorProfile?.socialLinks?.instagram && (
                  <a
                    href={creatorProfile?.socialLinks?.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-opacity-20 transition-colors bg-white/10"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.875-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"/>
                    </svg>
                  </a>
                )}
                {creatorProfile?.socialLinks?.youtube && (
                  <a
                    href={creatorProfile?.socialLinks?.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-opacity-20 transition-colors bg-white/10"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
                {creatorProfile?.socialLinks?.website && (
                  <a
                    href={creatorProfile?.socialLinks?.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-opacity-20 transition-colors bg-white/10"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 16.057v-3.057h2v3.057c1.14-.102 2-.317 2-.735 0-.418-.86-.633-2-.735V9.057c1.14-.102 2-.317 2-.735 0-.418-.86-.633-2-.735V5.057c1.14-.102 2-.317 2-.735 0-.418-.86-.633-2-.735V2h-2v1.057c-1.14.102-2 .317-2 .735 0 .418.86.633 2 .735v2.53c-1.14.102-2 .317-2 .735 0 .418.86.633 2 .735v2.53c-1.14.102-2 .317-2 .735 0 .418.86.633 2 .735z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </SectionCard>

          <hr className="border-white/20" />

          {/* Live Streams Section */}
          <div id="streams">
          <SectionCard title="Live Streams">
            {streamsLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Bars width={40} height={40} color="#8b5cf6" />
              </div>
            ) : creatorStreams.length > 0 ? (
              creatorStreams.map((stream) => (
                <div key={stream.id} className="col-span-full w-full">
                  <PublicStreamCard
                    title={stream.title || stream.name}
                    image={image1}
                    logo={stream.logo}
                    playbackId={stream.playbackId}
                    playb={stream.playbackId}
                    lastSeen={new Date(stream.lastSeen || 0)}
                    status={stream.isActive}
                    creatorId={creatorId}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-300">
                <p>No live streams available</p>
              </div>
            )}
          </SectionCard>
          </div>

          <hr className="border-white/20" />

          {/* Videos Section */}
          <div id="videos">
          <SectionCard title="Videos">
            {assetsLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Bars width={40} height={40} color="#8b5cf6" />
              </div>
            ) : creatorAssets.length > 0 ? (
              creatorAssets.map((asset) => (
                <VideoCard
                  key={asset.id}
                  title={asset.name}
                  assetData={asset}
                  imageUrl={image1}
                  playbackId={asset.playbackId}
                  createdAt={new Date(asset.createdAt)}
                  format={asset.videoSpec?.format}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-300">
                <p>No videos available</p>
              </div>
            )}
          </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreatorProfileLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Bars width={40} height={40} color="#3351FF" />
        <p className="mt-4">Loading creator profile...</p>
      </div>
    </div>
  );
} 