'use client';
import {
  LoadingIcon,
  OfflineErrorIcon,
} from '@livepeer/react/assets';
import * as Broadcast from '@livepeer/react/broadcast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { getIngest } from '@livepeer/react/external';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink } from 'lucide-react';
import { RootState } from '@/store/store';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { sendChatMessage, fetchChatMessages } from '@/features/chatAPI';
import { getUserProfile } from '@/lib/supabase-service';
import { BroadcastControls } from '@/components/templates/stream/broadcast/Broadcast';

interface DashboardBroadcastProps {
  streamName: string;
  streamKey: string;
  playbackId: string;
  creatorAddress: string;
  onStreamEnd?: () => void;
}

export function DashboardBroadcast({ 
  streamName, 
  streamKey, 
  playbackId,
  creatorAddress,
  onStreamEnd
}: DashboardBroadcastProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  
  const { messages: chatMessages } = useSelector((s: RootState) => s.chat);
  
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  // Fetch creator displayName for the visit link
  useEffect(() => {
    const fetchCreatorName = async () => {
      if (!creatorAddress) return;
      try {
        const profile = await getUserProfile(creatorAddress);
        if (profile?.displayName) {
          setCreatorDisplayName(profile.displayName);
        }
      } catch (error) {
        console.error('Error fetching creator profile:', error);
      }
    };
    fetchCreatorName();
  }, [creatorAddress]);

  // Session timer
  useEffect(() => {
    if (timerStarted) {
      const start = localStorage.getItem('broadcastStart')
        ? Number(localStorage.getItem('broadcastStart'))
        : Date.now();
      startTimeRef.current = start;
      localStorage.setItem('broadcastStart', start.toString());
      intervalRef.current = setInterval(() => {
        const delta = Date.now() - startTimeRef.current;
        const hrs = String(Math.floor(delta / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((delta % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((delta % 60000) / 1000)).padStart(2, '0');
        setSessionTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      localStorage.removeItem('broadcastStart');
      setSessionTime('00:00:00');
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerStarted]);

  // Build creator profile URL
  const creatorProfileUrl = creatorDisplayName 
    ? `/creator/${encodeURIComponent(creatorDisplayName)}`
    : creatorAddress 
    ? `/creator/${encodeURIComponent(creatorAddress)}`
    : null;

  // Copy link handler
  const handleCopyLink = async () => {
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
  };

  const handleStartStream = () => setTimerStarted(true);
  const handleEndStream = () => {
    setTimerStarted(false);
    if (onStreamEnd) {
      onStreamEnd();
    }
  };

  const handleSendMessage = useCallback(async () => {
    const messageData = {
      message: chatInput.trim(),
      streamId: playbackId,
      walletAddress: creatorAddress || '',
      sender: creatorAddress || '',
    };

    try {
      await dispatch(sendChatMessage(messageData)).unwrap();
      setChatInput('');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Chat error:', error);
    }
  }, [chatInput, creatorAddress, playbackId, dispatch]);

  useEffect(() => {
    if (playbackId) {
      dispatch(fetchChatMessages(playbackId));
    }
  }, [dispatch, playbackId]);

  useEffect(() => {
    if (!playbackId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (document.visibilityState === 'visible') {
        await dispatch(fetchChatMessages(playbackId));
      }
      if (!cancelled) {
        timer = setTimeout(tick, 5000);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchChatMessages(playbackId));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dispatch, playbackId]);

  return (
    <Broadcast.Root
      onError={(error) =>
        error?.type === 'permissions'
          ? toast.error('You must accept permissions to broadcast. Please try again.')
          : null
      }
      aspectRatio={16 / 9}
      ingestUrl={getIngest(streamKey)}
    >
      <div className="flex flex-col md:flex-row flex-1 h-full w-full overflow-hidden bg-black p-2 md:p-4 gap-2 md:gap-4">
        {/* Main Broadcast Area - Wider with padding */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/10 border-b border-white/20 rounded-t-lg">
            {/* Session Duration */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-md">
                <span className="text-white font-medium text-sm">{sessionTime}</span>
                <span className="text-gray-400 text-xs">Session</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {/* Start/Stop Stream Button */}
              <Broadcast.EnabledTrigger className="rounded-md">
                <Broadcast.EnabledIndicator
                  className="flex items-center bg-green-600 hover:bg-green-700 h-[36px] min-w-[120px] md:min-w-[140px] rounded-md text-white px-3 md:px-4 justify-center transition-colors text-xs md:text-sm"
                  matcher={false}
                  onClick={handleStartStream}
                >
                  <span className="font-medium">Start Stream</span>
                </Broadcast.EnabledIndicator>
                
                {/* End Stream Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Broadcast.EnabledIndicator
                      className="flex items-center justify-center bg-red-600 hover:bg-red-700 h-[36px] min-w-[120px] md:min-w-[140px] rounded-md text-white px-3 md:px-4 cursor-pointer transition-colors text-xs md:text-sm"
                      matcher={true}
                    >
                      <span className="font-medium">Stop Stream</span>
                    </Broadcast.EnabledIndicator>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="p-4 flex flex-col w-[280px] items-center rounded-lg z-50 bg-gray-900 border border-white/20 shadow-xl"
                      sideOffset={5}
                    >
                      <p className="text-white font-medium text-sm mb-4 text-center">
                        Are you sure you want to end this stream?
                      </p>
                      <div className="flex gap-3 w-full">
                        <DropdownMenu.Item
                          className="flex-1 flex items-center cursor-pointer px-4 py-2 border border-white/20 h-[36px] rounded-md text-white justify-center hover:bg-white/10 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-sm font-medium">Cancel</p>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onClick={handleEndStream}
                          className="flex-1 flex items-center cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 h-[36px] rounded-md text-white justify-center transition-colors"
                        >
                          <p className="text-sm font-medium">End Stream</p>
                        </DropdownMenu.Item>
                      </div>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </Broadcast.EnabledTrigger>

              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-xs md:text-sm font-medium"
              >
                <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Copy Link</span>
                <span className="sm:hidden">Copy</span>
              </button>

              {/* Visit Link Button */}
              {creatorProfileUrl && (
                <Link href={creatorProfileUrl} target="_blank" rel="noopener noreferrer">
                  <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-xs md:text-sm font-medium">
                    <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Visit</span>
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Broadcast Video Container */}
          <div className="flex-1 relative bg-black rounded-b-lg overflow-hidden">
            <BroadcastContainer />
          </div>
        </div>

        {/* Chat Panel - Thinner on desktop, below on mobile */}
        <div className="w-full md:w-64 lg:w-72 border-t md:border-t-0 md:border-l border-white/20 bg-white/5 flex flex-col rounded-lg md:rounded-l-none">
          <div className="p-3 border-b border-white/20 bg-white/10 rounded-t-lg md:rounded-t-none">
            <h3 className="font-medium text-white text-sm md:text-base">Chat</h3>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 min-h-[200px] md:min-h-0">
            <p className="text-center text-gray-400 text-xs md:text-sm mb-3 md:mb-4">Welcome to {streamName} chat!</p>
            {chatMessages.map((msg, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-2 md:p-3">
                <span className={`font-bold text-xs md:text-sm ${msg?.sender === creatorAddress ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {msg?.sender === creatorAddress ? 'You' : `${msg?.sender?.slice(0, 6)}...${msg?.sender?.slice(-4)}`}:
                </span>{' '}
                <span className="text-white text-xs md:text-sm">{msg?.message}</span>
              </div>
            ))}
          </div>
          
          {/* Chat Input */}
          <div className="p-3 border-t border-white/20 bg-white/10 rounded-b-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex flex-col space-y-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send message..."
                className="w-full border border-white/20 rounded-md py-2 px-3 bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm"
              />
              <button 
                type="submit" 
                className="bg-gradient-to-r from-yellow-500 to-teal-500 hover:from-yellow-600 hover:to-teal-600 text-black font-medium px-4 py-2 rounded-md transition-colors text-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </Broadcast.Root>
  );
}

// Broadcast Container Component
const BroadcastContainer = () => {
  return (
    <Broadcast.Container className="flex relative h-full w-full">
      <Broadcast.Video
        title="Live streaming"
        style={{
          height: '100%',
          width: '100%',
          objectFit: 'cover',
        }}
      />
      {/* Loading Indicator */}
      <Broadcast.LoadingIndicator className="w-full relative h-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <LoadingIcon className="w-8 h-8 animate-spin text-white" />
        </div>
      </Broadcast.LoadingIndicator>
      {/* Error Indicator */}
      <Broadcast.ErrorIndicator
        matcher="not-permissions"
        className="absolute select-none inset-0 text-center flex flex-col items-center justify-center gap-4 bg-black/80"
      >
        <OfflineErrorIcon className="h-[120px] w-full sm:flex hidden" />
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold text-white">Broadcast failed</div>
          <div className="text-sm text-gray-300">
            There was an error with broadcasting - it is retrying in the background.
          </div>
        </div>
      </Broadcast.ErrorIndicator>
      {/* Controls */}
      <BroadcastControls />
    </Broadcast.Container>
  );
};

