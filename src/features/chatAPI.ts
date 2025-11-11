import { createAsyncThunk } from '@reduxjs/toolkit';
import { sendChatMessage as sendChatMessageToSupabase, getChatMessages, getRecentChatMessages } from '@/lib/supabase-service';
import type { SupabaseChat } from '@/lib/supabase-types';

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  streamId: string;
  walletAddress: string;
}

export interface SendMessageRequest {
  message: string;
  streamId: string;
  walletAddress: string;
  sender: string; // shortened wallet address
}

// Helper function to convert Supabase chat to ChatMessage
function supabaseToChatMessage(supabaseChat: SupabaseChat): ChatMessage {
  return {
    id: supabaseChat.id || '',
    sender: supabaseChat.sender,
    message: supabaseChat.message,
    timestamp: supabaseChat.timestamp ? new Date(supabaseChat.timestamp) : new Date(supabaseChat.created_at || Date.now()),
    streamId: supabaseChat.stream_id,
    walletAddress: supabaseChat.wallet_address,
  };
}

// Send a chat message
export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData: SendMessageRequest) => {
    const supabaseChat = await sendChatMessageToSupabase({
      stream_id: messageData.streamId,
      sender: messageData.sender,
      wallet_address: messageData.walletAddress,
      message: messageData.message,
    });
    
    console.log('sendChatMessage response:', supabaseChat);
    const chatMessage = supabaseToChatMessage(supabaseChat);
    return chatMessage;
  }
);

// Fetch chat messages for a stream
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (playbackId: string) => {
    const supabaseChats = await getChatMessages(playbackId);
    const chatMessages = supabaseChats.map(supabaseToChatMessage);
    return chatMessages;
  }
);

// Fetch recent chat messages (for real-time updates)
export const fetchRecentMessages = createAsyncThunk(
  'chat/fetchRecent',
  async ({ streamId, lastMessageId }: { streamId: string; lastMessageId?: string }) => {
    const supabaseChats = await getRecentChatMessages(streamId, 50, lastMessageId);
    const chatMessages = supabaseChats.map(supabaseToChatMessage);
    console.log('fetchRecentMessages response:', chatMessages);
    return chatMessages;
  }
); 