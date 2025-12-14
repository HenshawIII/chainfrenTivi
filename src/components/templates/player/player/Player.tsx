'use client';
import React, { useCallback, useEffect, useState } from 'react';
import * as Player from '@livepeer/react/player';
import { Bars } from 'react-loader-spinner';
import { toast } from 'sonner';
import {
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  LoadingIcon,
  MuteIcon,
  OfflineErrorIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  PrivateErrorIcon,
  UnmuteIcon,
} from '@livepeer/react/assets';
import { Clip } from './Clip';
import { Settings } from './Settings';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { sendChatMessage, fetchChatMessages } from '@/features/chatAPI';
import { useViewMetrics } from '@/app/hook/useViewerMetrics';
import { useStreamGate } from '@/app/hook/useStreamGate';
import type { Src } from '@livepeer/react';
import { StreamGateModal } from './StreamGateModal';
import { StreamPayment } from './StreamPayment';
import { useRouter } from 'next/navigation';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { getUserProfile } from '@/lib/supabase-service';
import { Share2 } from 'lucide-react';
import Link from 'next/link';

export function PlayerWithControls({
  src,
  id,
  title,
  playbackId,
}: {
  src: Src[];
  title: string;
  playbackId: string;
  id: string;
}) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { viewerMetrics: totalViewers } = useViewMetrics({ playbackId });
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  
  // Get wallet address from Privy (Ethereum wallet)
  const walletAddress = wallets && wallets.length > 0 ? wallets[0].address : null;
  const connected = authenticated && ready && !!walletAddress;
  const { messages: chatMessages, sending: isSendingChat } = useSelector((s: RootState) => s.chat);
  const { stream, loading, error, hasAccess, setHasAccess, markPaid, processPayment, processingPayment, walletReady } = useStreamGate(playbackId);
  
  // Get creator displayName for share link
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null);
  
  // Chat state management
  const [chatInput, setChatInput] = useState('');

  // Fetch creator displayName for share link
  useEffect(() => {
    const fetchCreatorName = async () => {
      if (!id) return;
      try {
        const profile = await getUserProfile(id);
        if (profile?.displayName) {
          setCreatorDisplayName(profile.displayName);
        }
      } catch (error) {
        console.error('Error fetching creator profile:', error);
      }
    };
    fetchCreatorName();
  }, [id]);

  // Build creator profile URL for sharing
  const creatorProfileUrl = creatorDisplayName 
    ? `/creator/${encodeURIComponent(creatorDisplayName)}`
    : id 
    ? `/creator/${encodeURIComponent(id)}`
    : null;

  // Share handler
  const handleShare = useCallback(async () => {
    if (!creatorProfileUrl) {
      toast.error('Creator profile not available');
      return;
    }
    try {
      const fullUrl = `${window.location.origin}${creatorProfileUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Creator profile link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [creatorProfileUrl]);

  // Fetch chat messages when component mounts
  useEffect(() => {
    if (playbackId) {
      dispatch(fetchChatMessages(playbackId));
    }
  }, [playbackId, dispatch]);

  useEffect(() => {
    if (!playbackId) return;
    const interval = setInterval(() => {
      dispatch(fetchChatMessages(playbackId));
    }, 5000); // fetch every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch, playbackId]);
  

  // Chat functionality
  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || !connected || !walletAddress) {
      toast.error('Please connect your wallet to send messages');
      return;
    }

    const sender = walletAddress.slice(0, 5) + '...';
    const messageData = {
      message: chatInput.trim(),
      streamId: playbackId,
      walletAddress: walletAddress,
      sender,
    };

    try {
      await dispatch(sendChatMessage(messageData)).unwrap();
      setChatInput('');
      // toast.success('Message sent successfully!');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Chat error:', error);
    }
  }, [chatInput, connected, walletAddress, playbackId, dispatch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }, [handleSendChat]);

  // const fetchProducts = useCallback(async () => {
  //   if (!id) return;
  //   setProductsLoading(true);
  //   setProductsError(null);
  //   try {
  //     const { data } = await axios.get(`https://chaintv.onrender.com/api/${id}/products`);
  //     setProducts(data.product || []);
  //   } catch (e) {
  //     setProductsError('Failed to load products.');
  //     toast.error('Failed to load products.');
  //     console.log(e);
  //   } finally {
  //     setProductsLoading(false);
  //   }
  // }, [id]);

  // useEffect(() => {
  //   fetchProducts();
  // }, [fetchProducts]);

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center flex-col h-screen">
        <Bars width={40} height={40} color="#facc15" />
        <p>Loading stream…</p>
      </div>
    );
  }

  // 2. Error state
  if (error) {
    return <div className="text-center text-red-500 mt-10">{error}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-950 to-black -mx-3 md:-mx-6 p-2 md:p-4">
      <div className="w-[calc(100%+1.5rem)] md:w-[calc(100%+3rem)] flex flex-col md:flex-row h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] gap-2 md:gap-4 overflow-hidden">
        {/* Main Player Section - Wider */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-black rounded-lg h-full">
          {/* Top Bar with Viewer Count and Share Button */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/10 border-b border-white/20 rounded-t-lg">
            {/* Viewer Count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-md">
              <svg
                width="16"
                height="16"
                viewBox="0 0 19 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
              >
                <path
                  d="M1.13465 18.3333C0.874752 18.3333 0.662336 18.1219 0.680419 17.8626C0.921899 14.4003 3.80706 11.6666 7.33073 11.6666C10.9732 11.6666 13.9334 14.5877 13.9964 18.2152C13.9975 18.2801 13.9447 18.3333 13.8797 18.3333H1.13465ZM7.33073 10.8333C4.56823 10.8333 2.33073 8.59575 2.33073 5.83325C2.33073 3.07075 4.56823 0.833252 7.33073 0.833252C10.0932 0.833252 12.3307 3.07075 12.3307 5.83325C12.3307 8.59575 10.0932 10.8333 7.33073 10.8333ZM13.7277 12.9922C13.6526 12.9024 13.7358 12.7685 13.8472 12.8046C16.0719 13.5275 17.7493 15.4644 18.0974 17.8336C18.1369 18.1027 17.9199 18.3333 17.6478 18.3333H15.7817C15.7167 18.3333 15.6641 18.2804 15.6632 18.2155C15.6357 16.229 14.9131 14.4105 13.7277 12.9922ZM12.0353 10.8229C11.9351 10.8159 11.8957 10.6928 11.968 10.6229C13.2194 9.41095 13.9974 7.71297 13.9974 5.83325C13.9974 4.74321 13.7358 3.71428 13.2719 2.80581C13.2263 2.71635 13.3033 2.61265 13.4004 2.63835C15.1837 3.11026 16.4974 4.73431 16.4974 6.66659C16.4974 8.96867 14.6328 10.8333 12.3307 10.8333C12.2314 10.8333 12.1329 10.8298 12.0353 10.8229Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-white text-sm font-medium">
                {totalViewers?.viewCount || 0} {totalViewers?.viewCount === 1 ? 'viewer' : 'viewers'}
              </span>
            </div>

            {/* Share Button */}
            {creatorProfileUrl && (
              <Link href={creatorProfileUrl} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm font-medium">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share Creator</span>
                  <span className="sm:hidden">Share</span>
                </button>
              </Link>
            )}
          </div>

          {/* Player Container */}
          <div className="flex-1 relative bg-black rounded-b-lg overflow-hidden">
            <Player.Root autoPlay clipLength={30} src={src}>
              <Player.Container className="relative h-full w-full overflow-hidden bg-gray-950">
                <Player.Video title="Live stream" className="h-full w-full object-cover" />
                {/* Loading Indicator */}
                <Player.LoadingIndicator className="absolute inset-0 bg-black/50 backdrop-blur data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0">
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingIcon className="h-8 w-8 animate-spin text-white" />
                  </div>
                </Player.LoadingIndicator>
                {/* Generic Error Indicator */}
                <Player.ErrorIndicator
                  matcher="all"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-center backdrop-blur-lg data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0"
                >
                  <div className="flex items-center justify-center">
                    <LoadingIcon className="h-8 w-8 animate-spin text-white" />
                  </div>
                  <p className="text-white">Starting...</p>
                </Player.ErrorIndicator>
                {/* Offline Indicator */}
                <Player.ErrorIndicator
                  matcher="offline"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-center backdrop-blur-lg data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0"
                >
                  <OfflineErrorIcon className="hidden h-[120px] w-full sm:flex" />
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-white">Stream is offline</div>
                    <div className="text-sm text-gray-100">
                      Playback will start automatically once the stream has started
                    </div>
                  </div>
                </Player.ErrorIndicator>
                {/* Access Control / Private Stream Indicator */}
                <Player.ErrorIndicator
                  matcher="access-control"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-center backdrop-blur-lg data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0"
                >
                  <PrivateErrorIcon className="hidden h-[120px] w-full sm:flex" />
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold text-white">Stream is private</div>
                    <div className="text-sm text-gray-100">
                      It looks like you don&apos;t have permission to view this content
                    </div>
                  </div>
                </Player.ErrorIndicator>
                {/* Player Controls */}
                <Player.Controls
                  autoHide={1000}
                  className="bg-gradient-to-b gap-1 px-3 md:px-3 py-2 flex-col-reverse flex from-black/20 via-80% via-black/30 duration-1000 to-black/60 data-[visible=true]:animate-in data-[visible=false]:animate-out data-[visible=false]:fade-out-0 data-[visible=true]:fade-in-0"
                >
                  <div className="flex justify-between gap-4">
                    <div className="flex flex-1 items-center gap-3">
                      <Player.PlayPauseTrigger className="w-6 h-6 hover:scale-110 transition-all flex-shrink-0">
                        <Player.PlayingIndicator asChild matcher={false}>
                          <PlayIcon className="w-full h-full" />
                        </Player.PlayingIndicator>
                        <Player.PlayingIndicator asChild>
                          <PauseIcon className="w-full h-full text-white" />
                        </Player.PlayingIndicator>
                      </Player.PlayPauseTrigger>
                      <Player.LiveIndicator className="gap-2 flex items-center">
                        <div className="bg-red-600 h-1.5 w-1.5 rounded-full" />
                        <span className="text-sm text-white select-none">LIVE</span>
                      </Player.LiveIndicator>
                      <Player.LiveIndicator matcher={false} className="flex gap-2 items-center">
                        <Player.Time className="text-sm tabular-nums select-none text-white" />
                      </Player.LiveIndicator>
                      <Player.MuteTrigger className="w-6 h-6 hover:scale-110 transition-all flex-shrink-0">
                        <Player.VolumeIndicator asChild matcher={false}>
                          <MuteIcon className="w-full text-white h-full" />
                        </Player.VolumeIndicator>
                        <Player.VolumeIndicator asChild matcher={true}>
                          <UnmuteIcon className="w-full text-white h-full" />
                        </Player.VolumeIndicator>
                      </Player.MuteTrigger>
                      <Player.Volume className="relative mr-1 flex-1 group flex cursor-pointer items-center select-none touch-none max-w-[120px] h-5">
                        <Player.Track className="bg-white/30 relative grow rounded-full transition-all h-[2px] md:h-[3px] group-hover:h-[3px] group-hover:md:h-[4px]">
                          <Player.Range className="absolute bg-white rounded-full h-full" />
                        </Player.Track>
                        <Player.Thumb className="block transition-all group-hover:scale-110 w-3 h-3 bg-white rounded-full" />
                      </Player.Volume>
                    </div>
                    <div className="flex sm:flex-1 md:flex-[1.5] justify-end items-center gap-2.5">
                      <Player.FullscreenIndicator matcher={false} asChild>
                        <Settings className="w-6 h-6 transition-all text-white flex-shrink-0" />
                      </Player.FullscreenIndicator>
                      <Clip className="flex items-center text-white w-6 h-6 justify-center" />
                      <Player.PictureInPictureTrigger className="w-6 h-6 hover:scale-110 transition-all flex-shrink-0">
                        <PictureInPictureIcon className="w-full h-full text-white" />
                      </Player.PictureInPictureTrigger>
                      <Player.FullscreenTrigger className="w-6 h-6 hover:scale-110 transition-all flex-shrink-0">
                        <Player.FullscreenIndicator asChild>
                          <ExitFullscreenIcon className="w-full h-full text-white" />
                        </Player.FullscreenIndicator>
                        <Player.FullscreenIndicator matcher={false} asChild>
                          <EnterFullscreenIcon className="w-full h-full text-white" />
                        </Player.FullscreenIndicator>
                      </Player.FullscreenTrigger>
                    </div>
                  </div>
                  <Player.Seek className="relative group flex cursor-pointer items-center select-none touch-none w-full h-5">
                    <Player.Track className="bg-white/30 relative grow rounded-full transition-all h-[2px] md:h-[3px] group-hover:h-[3px] group-hover:md:h-[4px]">
                      <Player.SeekBuffer className="absolute bg-black/30 transition-all duration-1000 rounded-full h-full" />
                      <Player.Range className="absolute bg-white rounded-full h-full" />
                    </Player.Track>
                    <Player.Thumb className="block group-hover:scale-110 w-3 h-3 bg-white transition-all rounded-full" />
                  </Player.Seek>
                </Player.Controls>
              </Player.Container>
            </Player.Root>
          </div>
        </div>

        {/* Chat Panel - Thinner on desktop, below on mobile */}
        <div className="w-full md:w-64 lg:w-72 border-t md:border-t-0 md:border-l border-white/20 bg-white/5 flex flex-col rounded-lg md:rounded-l-none overflow-hidden h-full max-h-full">
          <div className="p-2.5 md:p-3 border-b border-white/20 bg-white/10 rounded-t-lg md:rounded-t-none flex-shrink-0">
            <h3 className="font-medium text-white text-sm md:text-base">Chat</h3>
            {!connected && (
              <p className="text-xs md:text-sm text-gray-400 mt-1">Connect wallet to chat</p>
            )}
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-2.5 md:p-3 space-y-2 md:space-y-3 min-h-0" style={{ maxHeight: 'calc(100% - 160px)' }}>
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs md:text-sm">
                <p>No messages yet. Be the first to chat!</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-white/10 rounded-lg p-2 md:p-3">
                    <span className={`font-bold text-xs md:text-sm ${msg.sender === id ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {msg.sender === id ? 'Streamer' : `${msg.sender?.slice(0, 6)}...${msg.sender?.slice(-4)}`}:
                    </span>{' '}
                    <span className="text-white text-xs md:text-sm">{msg.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Chat Input */}
          <div className="p-2.5 md:p-3 -translate-y-20 border-t border-white/20 bg-white/10 rounded-b-lg flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex flex-col space-y-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={connected ? "Send message..." : "Connect wallet to chat"}
                disabled={!connected || isSendingChat}
                className="w-full border border-white/20 rounded-md py-2 px-3 bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              />
              <button
                type="submit"
                disabled={!connected || isSendingChat || !chatInput.trim()}
                className="bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSendingChat ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Gate modal for paid streams - rendered on top of main content */}
      {!hasAccess && stream && stream.viewMode !== 'free' && (
        <StreamGateModal
          open={!hasAccess}
          onClose={() => router.back()}
          title="Locked Stream"
        >
          <StreamPayment
            playbackId={playbackId}
            usdAmount={stream.amount}
            recipientAddress={stream.creatorId}
            onPaymentSuccess={() => {
              setHasAccess(true);
              if (walletAddress) {
                markPaid(walletAddress);
              }
            }}
            processPayment={processPayment}
            processingPayment={processingPayment}
            walletReady={walletReady}
          />
        </StreamGateModal>
      )}
    </div>
  );
}

/**
 * Minimal loading UI that appears before or during buffering.
 */
export const PlayerLoading = ({ children }: { children?: React.ReactNode }) => (
  <div className="relative mx-auto flex max-w-2xl flex-col-reverse gap-3 overflow-hidden rounded-sm bg-black px-3 py-2 animate-pulse">
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-6 w-16 animate-pulse rounded-lg bg-gray-800 md:h-7 md:w-20" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-800" />
      </div>
    </div>
    <div className="h-2 w-full animate-pulse rounded-lg bg-gray-800" />
    {children}
  </div>
);
