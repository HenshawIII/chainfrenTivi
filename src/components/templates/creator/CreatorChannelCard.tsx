'use client';

import React from 'react';
import Image, { StaticImageData } from 'next/image';
import { FaTwitter, FaInstagram, FaYoutube, FaLink } from 'react-icons/fa';

interface CreatorChannelCardProps {
  title: string;
  logo: string | StaticImageData | null;
  bio: string | null;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  defaultImage: StaticImageData;
  isActive?: boolean;
}

export const CreatorChannelCard: React.FC<CreatorChannelCardProps> = ({
  title,
  logo,
  bio,
  socialLinks,
  defaultImage,
  isActive = false,
}) => {
  // Helper to check if URL is from Livepeer CDN (which might fail)
  const isLivepeerCDN = (url: string | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('recordings-cdn-s.lp-playback.studio') || url.includes('vod-cdn.lp-playback.studio');
  };

  const imageSrc = logo || defaultImage;
  const useRegularImg = typeof imageSrc === 'string' && isLivepeerCDN(imageSrc);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start lg:items-center">
      {/* Left: Channel Logo and Name */}
      <div className="flex-shrink-0 flex flex-col items-center lg:items-start w-full lg:w-auto">
        <div className="relative w-40 h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden border-4 border-yellow-400/50 mb-4">
          {useRegularImg ? (
            <img
              src={imageSrc as string}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 160px, 192px"
            />
          )}
          {/* Live Status Badge */}
          {isActive && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
        {/* Channel Name */}
        {/* <h2 className="text-white font-bold text-2xl text-center lg:text-left max-w-[192px] break-words">{title}</h2> */}
      </div>

      {/* Middle: Bio */}
      {bio && (
        <div className="flex-1 w-full lg:max-w-2xl min-w-0 overflow-y-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 h-full">
            <h3 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base">
              {bio}
            </p>
          </div>
        </div>
      )}

      {/* Right: Social Links */}
      <div className="flex-shrink-0 flex flex-row lg:flex-col items-center justify-center lg:items-start gap-4 lg:gap-3 w-full lg:w-auto">
        {Object.values(socialLinks).some((link) => link && link.trim() !== '') ? (
          <>
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Twitter"
              >
                <FaTwitter className="text-xl text-blue-400" />
              </a>
            )}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Instagram"
              >
                <FaInstagram className="text-xl text-pink-500" />
              </a>
            )}
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="YouTube"
              >
                <FaYoutube className="text-xl text-red-500" />
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Website"
              >
                <FaLink className="text-xl text-yellow-400" />
              </a>
            )}
          </>
        ) : (
          <div className="text-gray-400 text-sm text-center lg:text-left py-2">
            No social links
          </div>
        )}
      </div>
    </div>
  );
};

