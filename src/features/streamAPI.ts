import { createAsyncThunk } from '@reduxjs/toolkit';
import { InputCreatorIdType } from 'livepeer/models/components';
import api from '../utils/api'; // Assuming you have an axios instance setup
import { Livepeer } from 'livepeer';
import { createStream, getAllStreams as getAllStreamsFromSupabase, getStreamByPlaybackId } from '../lib/supabase-service';

interface CreateLivestreamProps {
  streamName: string;
  record: boolean;
  creatorId: string;
  viewMode?: 'free' | 'one-time' | 'monthly';
  amount?: number;
  description: string;
  bgcolor: string;
  color: string;
  fontSize: string;
  logo: string;
  donation?: number[];
}

interface UpdateLivestreamProps {
  id: string;
  record?: boolean;
  creatorId?: string;
  name?: string;
  suspended?: boolean;
}

// const livepeer = new Livepeer({
//   apiKey: process.env.NEXT_PUBLIC_STUDIO_API_KEY ?? '',
// });

export const createLivestream = createAsyncThunk(
  'streams/createLivestream',
  async (
    {
      streamName,
      record,
      creatorId,
      viewMode,
      amount,
      description,
      bgcolor,
      color,
      fontSize,
      logo,
      donation,
    }: CreateLivestreamProps,
    { rejectWithValue },
  ) => {
    try {
      // Step 1: Create the livestream
      const response = await api.post('/stream', {
        name: streamName,
        record,
        creatorId: {
          type: InputCreatorIdType.Unverified,
          value: creatorId,
        },
        
      });

      const { playbackId, name } = response.data;

      // Step 2: Save stream metadata to Supabase
      try {
        await createStream({
          playback_id: playbackId,
          view_mode: viewMode || 'free',
          description: description || null,
          amount: amount || null,
          streamName: name || streamName,
          creatorId: creatorId,
          logo: logo || null,
          title: name || streamName || null,
          bgcolor: bgcolor || null,
          color: color || null,
          fontSize: fontSize ? parseInt(fontSize) : null,
          font_family: null,
          Users: [],
          donations: donation || [],
        });
      } catch (supabaseError: any) {
        console.error('Failed to save stream to Supabase:', supabaseError);
        // Continue anyway - stream is created in Livepeer
        // In production, you might want to handle this differently
      }

      return response.data;
    } catch (error: any) {
      console.log('Error creating livestream:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getAllStreams = createAsyncThunk('streams/getAllStreams', async () => {
  // Step 1: Get all streams from Livepeer
  const response = await api.get('/stream');
  const streams = response.data;

  // Step 2: Enrich each stream with metadata from Supabase
  const enrichedStreams = await Promise.all(
    streams.map(async (stream: any) => {
      if (!stream.playbackId) {
        return { ...stream, logo: '' };
      }

      try {
        // Fetch stream details from Supabase
        const supabaseStream = await getStreamByPlaybackId(stream.playbackId);
        
        if (supabaseStream) {
          // Merge Supabase metadata into the stream
          return {
            ...stream,
            logo: supabaseStream.logo || stream.logo || '',
            title: supabaseStream.title || supabaseStream.streamName || stream.name || stream.title || '',
            description: supabaseStream.description || stream.description || '',
            viewMode: supabaseStream.view_mode || stream.viewMode || 'free',
            amount: supabaseStream.amount || stream.amount || 0,
            bgcolor: supabaseStream.bgcolor || stream.bgcolor || '',
            color: supabaseStream.color || stream.color || '',
            fontSize: supabaseStream.fontSize?.toString() || stream.fontSize || '',
            fontFamily: supabaseStream.font_family || stream.fontFamily || '',
            donation: supabaseStream.donations || stream.donation || [],
            Users: supabaseStream.Users || stream.Users || [],
          };
        }
        
        // If no Supabase data, return stream as-is
        return { ...stream, logo: stream.logo || '' };
      } catch (error) {
        // If Supabase fetch fails, return stream without metadata
        console.warn(`Failed to fetch metadata for stream ${stream.playbackId}:`, error);
        return { ...stream, logo: stream.logo || '' };
      }
    })
  );

  return enrichedStreams;
});

export const deleteStream = createAsyncThunk('streams/deleteStream', async (id: string) => {
  await api.delete(`/stream/${id}`);
  return id;
});

export const getStreamById = createAsyncThunk('streams/getStreamById', async (id: string) => {
  const response = await api.get(`/stream/${id}`);
  return response.data;
});

export const updateLivestream = createAsyncThunk(
  'streams/updateStream',
  async ({ id, record, name }: UpdateLivestreamProps) => {
    const response = await api.patch(`/stream/${id}`, {
      name: name,
      record,
      // creatorId: {
      //   type: InputCreatorIdType.Unverified,
      //   value: creatorId,
      // },
    });
    return response.data;
  },
);
//
export const terminateStream = createAsyncThunk('streams/terminateStream', async (id: string) => {
  await api.delete(`/stream/${id}/terminate`);
  return id;
});
