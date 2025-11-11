import { createAsyncThunk } from '@reduxjs/toolkit';
import { getUserProfile, upsertUserProfile, updateUserProfile } from '../lib/supabase-service';
import type { SupabaseUser } from '../lib/supabase-types';

export interface ProfileData {
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
  isPublic: boolean;
}

// Helper function to convert ProfileData to Supabase format
function profileDataToSupabase(creatorAddress: string, profileData: ProfileData): {
  creatorId: string;
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  socialLinks: string[];
  Channels: string[];
} {
  // Convert socialLinks object to array of strings
  const socialLinksArray: string[] = [];
  if (profileData.socialLinks.twitter) socialLinksArray.push(profileData.socialLinks.twitter);
  if (profileData.socialLinks.instagram) socialLinksArray.push(profileData.socialLinks.instagram);
  if (profileData.socialLinks.youtube) socialLinksArray.push(profileData.socialLinks.youtube);
  if (profileData.socialLinks.website) socialLinksArray.push(profileData.socialLinks.website);

  return {
    creatorId: creatorAddress,
    displayName: profileData.displayName || null,
    bio: profileData.bio || null,
    avatar: profileData.avatar || null,
    socialLinks: socialLinksArray,
    Channels: [], // Will be populated separately if needed
  };
}

// Helper function to convert Supabase format to ProfileData
function supabaseToProfileData(supabaseUser: SupabaseUser | null): ProfileData | null {
  if (!supabaseUser) return null;

  // Convert socialLinks array back to object
  const socialLinks: ProfileData['socialLinks'] = {};
  supabaseUser.socialLinks?.forEach((link) => {
    if (link.includes('twitter.com') || link.includes('x.com')) {
      socialLinks.twitter = link;
    } else if (link.includes('instagram.com')) {
      socialLinks.instagram = link;
    } else if (link.includes('youtube.com')) {
      socialLinks.youtube = link;
    } else {
      socialLinks.website = link;
    }
  });

  return {
    displayName: supabaseUser.displayName || '',
    bio: supabaseUser.bio || '',
    avatar: supabaseUser.avatar || '',
    socialLinks,
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      accentColor: '#0000ff',
    },
    isPublic: true, // Default to public
  };
}

// Fetch profile by creator address
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (creatorAddress: string, { rejectWithValue }) => {
    try {
      const supabaseUser = await getUserProfile(creatorAddress);
      const profileData = supabaseToProfileData(supabaseUser);
      return profileData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch profile');
    }
  }
);

// Update profile
export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({ creatorAddress, profileData }: { creatorAddress: string; profileData: ProfileData }, { rejectWithValue }) => {
    try {
      const supabaseData = profileDataToSupabase(creatorAddress, profileData);
      const updatedUser = await updateUserProfile(creatorAddress, supabaseData);
      const convertedProfile = supabaseToProfileData(updatedUser);
      return convertedProfile || profileData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

// Create new profile
export const createProfile = createAsyncThunk(
  'profile/createProfile',
  async ({ creatorAddress, profileData }: { creatorAddress: string; profileData: ProfileData }, { rejectWithValue }) => {
    try {
      const supabaseData = profileDataToSupabase(creatorAddress, profileData);
      const createdUser = await upsertUserProfile(supabaseData);
      const convertedProfile = supabaseToProfileData(createdUser);
      return convertedProfile || profileData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create profile');
    }
  }
);

