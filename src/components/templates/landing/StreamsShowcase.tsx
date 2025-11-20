'use client';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getAssets } from '@/features/assetsAPI';
import Spinner from '@/components/Spinner';
import Link from 'next/link';
import { Stream, Asset } from '@/interfaces';
import image1 from '@/assets/image1.png';
import { useFetchPlaybackId } from '@/app/hook/usePlaybckInfo';
import Image from 'next/image';
import { getUserProfile } from '@/lib/supabase-service';
// import Logo from '@/components/Logo';

interface StreamsShowcaseProps {
  streams: Stream[];
  loading: boolean;
}

export default function StreamsShowcase({ streams, loading }: StreamsShowcaseProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading: assetsLoading } = useSelector((state: RootState) => state.assets);
  const [activeTab, setActiveTab] = useState<'streams' | 'videos'>('streams');
  const [creatorIdToUsername, setCreatorIdToUsername] = useState<Record<string, string>>({});

  // Filter out streams without creatorId
  const filteredStreams = streams.filter(stream => stream.creatorId && stream.creatorId.value);

  // Get all unique creator IDs from streams and assets
  const allCreatorIds = useMemo(() => {
    const streamCreatorIds = filteredStreams.map(s => s.creatorId?.value).filter(Boolean) as string[];
    const assetCreatorIds = assets.map(a => a.creatorId?.value).filter(Boolean) as string[];
    return Array.from(new Set([...streamCreatorIds, ...assetCreatorIds]));
  }, [filteredStreams, assets]);

  // Fetch usernames for all unique creator IDs
  useEffect(() => {
    const fetchUsernames = async () => {
      if (allCreatorIds.length === 0) return;

      const usernameMap: Record<string, string> = {};
      
      await Promise.all(
        allCreatorIds.map(async (creatorId) => {
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
    };

    fetchUsernames();
  }, [allCreatorIds]);

  useEffect(() => {
   console.log(filteredStreams);
  }, [filteredStreams]);
  
  useEffect(() => {
    // Load assets for the videos tab
    dispatch(getAssets());
  }, [dispatch]);

  return (
    <section id="streams-showcase" className="py-16 px-4 max-w-7xl mx-auto mt-16 relative">
      
      <h2 className="text-3xl font-bold text-white mb-8 text-center">Available Content</h2>
      
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20 flex">
          <button
            onClick={() => setActiveTab('streams')}
            className={`flex-1 px-6 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'streams'
                ? 'bg-white text-gray-900 font-semibold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Livestreams
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 px-6 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'videos'
                ? 'bg-white text-gray-900 font-semibold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'streams' ? (
        // Streams Tab
        loading ? (
          <div className="flex justify-center items-center h-32">
            <Spinner />
          </div>
        ) : filteredStreams && filteredStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredStreams.map((stream) => {
              const creatorId = stream.creatorId?.value;
              const username = creatorId ? creatorIdToUsername[creatorId] : null;
              const profileIdentifier = username || creatorId || '';
              const displayName = username || (creatorId ? `${creatorId.slice(0, 5)}...${creatorId.slice(-5)}` : 'Unknown');
              
              return (
              <Link 
                key={stream.id} 
                href={`/creator/${encodeURIComponent(profileIdentifier)}`} 
                className="block bg-white/10 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform"
              >
                <div className="h-40 bg-gray-800 flex items-center justify-center relative">
                  {stream.logo ? (
                    <img src={stream.logo} alt={stream.name} className="object-cover w-full h-full" />
                  ) : (
                    <img src={image1.src} alt={stream.name} className="object-cover w-full h-full" />
                  )}
                  {stream.isActive && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">{stream.name}</h3>
                  {creatorId && (
                    <div className="text-xs text-yellow-300">by {displayName}</div>
                  )}
                  {/* <div className="text-xs text-purple-300">{stream.description}</div> */}
                </div>
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-400">No streams available at the moment.</div>
        )
      ) : (
        // Videos Tab
        assetsLoading ? (
          <div className="flex justify-center items-center h-32">
            <Spinner />
          </div>
        ) : assets && assets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {assets.map((asset) => (
              <VideoThumbnailCard key={asset.id} asset={asset} creatorIdToUsername={creatorIdToUsername} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400">No videos available at the moment.</div>
        )
      )}
    </section>
  );
}

// Video Thumbnail Card Component
function VideoThumbnailCard({ asset, creatorIdToUsername }: { asset: Asset; creatorIdToUsername: Record<string, string> }) {
  const { thumbnailUrl, loading } = useFetchPlaybackId(asset.playbackId);
  const creatorId = asset.creatorId?.value;
  const username = creatorId ? creatorIdToUsername[creatorId] : null;
  const profileIdentifier = username || creatorId || '';
  const displayName = username || (creatorId ? `${creatorId.slice(0, 5)}...${creatorId.slice(-5)}` : 'Unknown');

  return (
    <Link 
      href={`/creator/${encodeURIComponent(profileIdentifier)}`} 
      className="block bg-white/10 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform"
    >
      <div className="h-40 bg-gray-800 flex items-center justify-center relative">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <Spinner />
          </div>
        ) : thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={asset.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <span className="text-gray-400 text-center text-lg">No thumbnail</span>
        )}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {asset.videoSpec?.duration ? 
            `${Math.floor(asset.videoSpec.duration / 60)}:${(asset.videoSpec.duration % 60).toString().padStart(2, '0')}` : 
            '00:00'
          }
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 truncate">{asset.name}</h3>
        {creatorId && (
          <div className="text-xs text-yellow-300">by {displayName}</div>
        )}
      </div>
    </Link>
  );
} 