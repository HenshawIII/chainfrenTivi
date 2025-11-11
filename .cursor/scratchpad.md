# ChainfrenTV App Analysis & Redesign Plan

## Background and Motivation

The user wants to redesign the ChainfrenTV application. This is a Next.js-based live streaming platform that integrates with Livepeer for video streaming, Privy for authentication, and includes monetization features. The app allows creators to create livestreams, upload video assets, and monetize their content through various payment models.

**NEW REQUIREMENT**: The user wants to create a shareable creator profile page that displays creator details, streams, and assets. This page will be generated from the settings page and follow a similar pattern to the existing view/[playbackId] route.

**LATEST REQUIREMENT**: The user wants to create a public landing page accessible before authentication with a hero component introducing the product and a section displaying all available streams. Additionally, an AuthGuard component should be created to protect routes that require authentication.

**NEW MIGRATION REQUIREMENT**: Migrate from custom backend service (`chaintv.onrender.com`) to Supabase for storing stream data, video data, user profiles, and chats. Supabase is already installed and tables have been created: `streams`, `videos`, `users`, `chats`.

## Current App Architecture Analysis

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: Redux Toolkit with RTK Query patterns
- **Authentication**: Privy (Web3 wallet + social login)
- **Video Streaming**: Livepeer Studio API
- **Payment Processing**: OnchainKit (Coinbase)
- **UI Components**: Radix UI + custom components
- **File Upload**: TUS protocol for video uploads

### Core Features Identified

#### 1. Stream Management
- **Creation**: Users can create livestreams with customization options
- **Broadcasting**: Live streaming with Livepeer integration
- **Recording**: Optional stream recording
- **Customization**: Background colors, text colors, font sizes, logos
- **Monetization**: Free, one-time payment, or monthly subscription models

#### 2. Video Asset Management
- **Upload**: Video file uploads using TUS protocol
- **Storage**: Assets stored via Livepeer
- **Playback**: Video player with controls
- **Organization**: User-specific asset filtering

#### 3. Monetization System
- **Payment Models**: Free, one-time, monthly subscription
- **Donation Presets**: Customizable donation amounts
- **Product Store**: Merchandise/products for sale
- **Access Control**: Stream gating based on payment status

#### 4. User Experience
- **Dashboard**: Overview of streams and assets
- **Analytics**: Viewer metrics and performance data
- **Chat**: Real-time chat during streams
- **Mobile Responsive**: Mobile sidebar and responsive design

#### 5. NEW: Creator Profile Pages
- **Shareable URLs**: Public profile pages for creators
- **Creator Details**: Display creator information and bio
- **Content Showcase**: Streams and video assets
- **Link Generation**: Settings page integration for profile URL creation

### State Management Architecture

#### Redux Store Structure
```typescript
{
  streams: {
    streams: Stream[],
    loading: boolean,
    success: boolean,
    error: string | null,
    stream: Stream | null
  },
  assets: {
    assets: Asset[],
    loading: boolean,
    error: string | null,
    success: boolean
  }
}
```

#### Key API Endpoints
- **Livepeer Studio**: `/stream`, `/asset`, `/data/views` (will remain unchanged)
- **Custom Backend** (TO BE MIGRATED TO SUPABASE): `https://chaintv.onrender.com/api/`
  - `/streams/addstream` - Stream metadata → Supabase `streams` table
  - `/streams/getstream` - Stream details → Supabase `streams` table
  - `/streams/updatestream` - Update stream → Supabase `streams` table
  - `/streams/deletestream` - Delete stream → Supabase `streams` table
  - `/streams/addpayinguser` - Add paying user → Supabase `streams` table
  - `/streams/disable` - Disable stream → Supabase `streams` table
  - `/videos/addvideo` - Video metadata → Supabase `videos` table
  - `/videos/getvideo` - Video details → Supabase `videos` table
  - `/videos/deletevideo` - Delete video → Supabase `videos` table
  - `/videos/disable` - Disable video → Supabase `videos` table
  - `/creators/{creatorId}/profile` - Creator profile → Supabase `users` table
  - `/chat/{streamId}/send` - Send chat message → Supabase `chats` table
  - `/chat/{playbackId}/fetch` - Fetch chat messages → Supabase `chats` table
  - `/{creatorId}/products` - Creator products (may need new table or extend users table)
  - `/post/products` - Create product (may need new table)
  - `/update/products/{address}` - Update product (may need new table)
  - `/delete/products/{productId}/{address}` - Delete product (may need new table)

### User Flow Analysis

#### 1. Authentication Flow
1. User connects via Privy (wallet or social login)
2. Embedded wallet created automatically
3. User redirected to dashboard if authenticated

#### 2. Stream Creation Flow
1. User clicks "Create new stream channel"
2. Form with customization options (name, colors, logo, etc.)
3. Stream created via Livepeer API
4. Metadata sent to custom backend
5. User redirected to broadcast page

#### 3. Broadcasting Flow
1. User accesses stream page with stream ID
2. Livepeer broadcast component loads
3. Real-time viewer metrics displayed
4. Chat functionality available
5. Stream customization applied

#### 4. Viewer Experience Flow
1. Viewer accesses stream URL
2. Payment gate check (if not free)
3. Stream player loads with customization
4. Sidebar shows creator's other videos
5. Chat and interaction features

#### 5. NEW: Creator Profile Flow
1. Creator goes to `/dashboard/settings`
2. Creator generates/customizes their profile page
3. Creator gets shareable URL (e.g., `/creator/{creatorId}`)
4. Viewers access profile page to see creator's content
5. Profile page displays streams, assets, and creator details

### Key Challenges and Analysis

#### 1. Architecture Issues
- **Dual API System**: Livepeer + custom backend creates complexity
- **State Synchronization**: Multiple sources of truth for stream data
- **Error Handling**: Inconsistent error handling across components
- **Loading States**: Multiple loading states that could be consolidated

#### 2. User Experience Issues
- **Complex Navigation**: Sidebar with many commented-out options
- **Mobile Experience**: Basic mobile sidebar implementation
- **Form Complexity**: Stream creation form has many fields
- **Payment Flow**: Stream gating might interrupt user experience

#### 3. Technical Debt
- **Type Safety**: Some `any` types and loose typing
- **Component Structure**: Large components with multiple responsibilities
- **API Integration**: Manual API calls instead of RTK Query
- **State Management**: Some local state that could be in Redux

#### 4. Performance Considerations
- **Bundle Size**: Multiple large dependencies
- **Real-time Updates**: Polling for metrics instead of WebSocket
- **Image Optimization**: Static image imports
- **Caching**: Limited caching strategy

### Current File Structure Analysis

#### Core Components
- **Dashboard**: Main user interface with streams and assets
- **Stream Creation**: Complex form with customization options
- **Broadcast**: Live streaming interface with controls
- **Player**: Video playback with chat and sidebar
- **Upload**: Video asset upload with TUS protocol
- **Settings**: Account management and linking (currently basic)

#### State Management
- **Redux Store**: Centralized state for streams and assets
- **Custom Hooks**: Stream gate, viewer metrics, asset management
- **Context**: Stream context (partially implemented)

#### API Layer
- **Livepeer Integration**: Direct API calls to Livepeer Studio
- **Custom Backend**: Additional metadata and business logic
- **Authentication**: Privy integration for Web3 wallets

## NEW: Creator Profile Page Implementation Plan

### Phase 1: Backend API Development
- [ ] Create creator profile API endpoint
- [ ] Design creator profile data structure
- [ ] Implement profile customization endpoints
- [ ] Add profile URL generation logic

### Phase 2: Frontend Route Structure
- [x] Create `/creator/[creatorId]` route
- [x] Implement creator profile page component
- [x] Add profile data fetching logic
- [x] Create profile customization interface

### Phase 3: Settings Page Integration
- [x] Add profile customization section to settings
- [x] Implement profile URL generation
- [x] Add profile preview functionality
- [x] Create shareable link generation

### Phase 4: Profile Page Features
- [x] Creator details section (bio, social links, etc.)
- [x] Streams showcase with live status
- [x] Video assets gallery
- [x] Responsive design for mobile/desktop
- [ ] SEO optimization for public pages

### Phase 5: Advanced Features
- [ ] Profile analytics (views, engagement)
- [ ] Custom profile themes
- [ ] Social sharing integration
- [ ] Profile verification badges

## High-level Task Breakdown

### NEW: Landing Page & Authentication Guard Implementation

#### Phase 1: Landing Page Structure
- [ ] **Task 1.1**: Create a new landing page route that doesn't require authentication
- [ ] **Task 1.2**: Design and implement Hero component with product introduction
- [ ] **Task 1.3**: Create streams showcase section to display all available streams
- [ ] **Task 1.4**: Add navigation between landing page and authenticated areas
- **Success Criteria**: Landing page loads without authentication, displays hero section and streams, has proper navigation

#### Phase 2: AuthGuard Component
- [ ] **Task 2.1**: Create AuthGuard component that checks authentication status
- [ ] **Task 2.2**: Implement redirect logic for unauthenticated users
- [ ] **Task 2.3**: Create HOC (Higher Order Component) wrapper for protected routes
- [ ] **Task 2.4**: Apply AuthGuard to existing protected routes (dashboard, settings, etc.)
- **Success Criteria**: AuthGuard properly protects routes, redirects unauthenticated users, allows authenticated users to access protected content

#### Phase 3: Route Restructuring
- [ ] **Task 3.1**: Update main page.tsx to redirect to landing page instead of auth
- [ ] **Task 3.2**: Modify authentication flow to work with new landing page
- [ ] **Task 3.3**: Update navigation components to handle public/private routes
- [ ] **Task 3.4**: Test authentication flow end-to-end
- **Success Criteria**: Users can access landing page without auth, protected routes are properly guarded, authentication flow works seamlessly

### Phase 1: Architecture Assessment & Planning

## Project Status Board

### Current Sprint: Supabase Migration
- [ ] **Phase 1**: Create Supabase Service Layer & Type Definitions
- [ ] **Phase 2**: Migrate Stream Operations
- [ ] **Phase 3**: Migrate Video Operations
- [ ] **Phase 4**: Migrate Profile Operations
- [ ] **Phase 5**: Migrate Chat Operations
- [ ] **Phase 6**: Cleanup & Final Testing

### Previous Sprint: Landing Page & AuthGuard Implementation
- [x] **Task 1.1**: Create a new landing page route that doesn't require authentication
- [x] **Task 1.2**: Design and implement Hero component with product introduction  
- [x] **Task 1.3**: Create streams showcase section to display all available streams
- [x] **Task 1.4**: Add navigation between landing page and authenticated areas
- [x] **Task 2.1**: Create AuthGuard component that checks authentication status
- [x] **Task 2.2**: Implement redirect logic for unauthenticated users
- [x] **Task 2.3**: Create HOC wrapper for protected routes
- [x] **Task 2.4**: Apply AuthGuard to existing protected routes
- [x] **Task 3.1**: Update main page.tsx to redirect to landing page instead of auth
- [x] **Task 3.2**: Modify authentication flow to work with new landing page
- [x] **Task 3.3**: Update navigation components to handle public/private routes
- [x] **Task 3.4**: Test authentication flow end-to-end

### Completed Tasks
- [x] Creator profile page implementation
- [x] Solana wallet integration
- [x] React hooks error fixes
- [x] Landing page implementation
- [x] AuthGuard component creation
- [x] Route protection implementation

## Current Status / Progress Tracking

**Current Phase**: Migration Complete - Ready for Testing
**Next Action**: Test all functionality with Supabase
**Blockers**: None

## Executor's Feedback or Assistance Requests

### Supabase Migration Analysis Complete

**Analysis Summary:**
✅ Identified all backend API integration points (31+ locations)
✅ Documented current backend endpoints and their Supabase table mappings
✅ Created comprehensive migration plan with 6 phases
✅ Identified all files that need changes (15+ files)
✅ Created detailed task breakdown with success criteria

**Key Findings:**
- **Streams**: 8 backend endpoints need migration to `streams` table
- **Videos**: 4 backend endpoints need migration to `videos` table  
- **Profiles**: 3 backend endpoints need migration to `users` table
- **Chats**: 2 backend endpoints need migration to `chats` table
- **Products**: May need separate table or schema extension

**Questions for User:**
1. Can you confirm the exact schema of your Supabase tables (`streams`, `videos`, `users`, `chats`)? This will help ensure type safety.
2. How are `paying_users` stored? As a JSONB array or a separate table?
3. Do you have a `products` table, or should products be stored in a different way?
4. Should we implement Row Level Security (RLS) policies, or is the current setup sufficient?

**Migration Status:**
✅ Phase 1: Supabase service layer created
✅ Phase 2: Stream operations migrated
✅ Phase 3: Video operations migrated
✅ Phase 4: Profile operations migrated
✅ Phase 5: Chat operations migrated
✅ Phase 6: Cleanup completed (backendApi.ts removed)

**Remaining Items (to be handled separately):**
- Product store operations (Store.tsx, AddProductDialog.tsx, EditProduct.tsx, DeleteProductDialog.tsx) - requires products table
- ChannelSelector disable operations - user confirmed no disabled field exists, functionality can be removed or handled differently
- Commented-out code references in Player.tsx and page.tsx (can be cleaned up later)

**Ready for testing:**
All core functionality (streams, videos, profiles, chats) has been migrated to Supabase. The application should now work with Supabase instead of the custom backend.

---

## NEW: Supabase Migration Plan

### Background
The application currently uses a custom backend service at `chaintv.onrender.com` to store:
- Stream metadata (customization, monetization settings, paying users)
- Video/asset metadata (monetization settings, paying users)
- User profiles (creator profiles with bio, social links, theme)
- Chat messages (real-time chat during streams)
- Products (merchandise store items)

**Migration Goal**: Replace all custom backend API calls with Supabase database operations while maintaining the same functionality.

### Current Backend Integration Points

#### 1. Stream Management (`streamAPI.ts`)
- **`createLivestream`**: Creates stream in Livepeer, then sends metadata to `/streams/addstream`
- **`getAllStreams`**: Fetches from Livepeer, then enriches with data from `/streams/getstream`
- **`deleteStream`**: Deletes from Livepeer only (backend deletion in Popup.tsx)
- **`updateLivestream`**: Updates in Livepeer only (backend update in Dialog.tsx)

#### 2. Video/Asset Management (`assetsAPI.ts`, `UploadVideoAsset.tsx`)
- **`requestAssetUpload`**: Creates asset in Livepeer
- **`UploadVideoAsset`**: After Livepeer upload, sends metadata to `/videos/addvideo`
- **`deleteAsset`**: Deletes from Livepeer only (backend deletion in Popup.tsx)

#### 3. Profile Management (`profileAPI.ts`)
- **`fetchProfile`**: Fetches from `/creators/{creatorId}/profile`
- **`updateProfile`**: Updates via `/creators/{creatorId}/profile`
- **`createProfile`**: Creates via `/creators/{creatorId}/profile`
- Also used in `CreatorProfile.tsx` component

#### 4. Chat Management (`chatAPI.ts`)
- **`sendChatMessage`**: Sends to `/chat/{streamId}/send`
- **`fetchChatMessages`**: Fetches from `/chat/{playbackId}/fetch`
- **`fetchRecentMessages`**: Fetches from `/chat/{streamId}/fetch` with pagination

#### 5. Stream/Video Gating (`useStreamGate.ts`, `useAssetGate.ts`)
- **`useStreamGate`**: Fetches stream details from `/streams/getstream`, checks paying users, processes payments, adds paying user via `/streams/addpayinguser`
- **`useAssetGate`**: Fetches video details from `/videos/getvideo`, checks paying users

#### 6. Component-Level Backend Calls
- **`Popup.tsx`**: 
  - Deletes stream via `/streams/deletestream`
  - Deletes video via `/videos/deletevideo`
- **`Dialog.tsx`**: Updates stream via `/streams/updatestream`
- **`ChannelSelector.tsx`**: Disables streams/videos via `/streams/disable` and `/videos/disable`
- **Store Components**: Product CRUD operations (may need separate table)

### Supabase Table Structure (Assumed)

Based on the user's mention of tables: `streams`, `videos`, `users`, `chats`

#### Expected Schema (to be confirmed):
```sql
-- streams table
- id (uuid, primary key)
- playback_id (text, unique)
- creator_id (text)
- stream_name (text)
- title (text)
- description (text)
- view_mode (text: 'free' | 'one-time' | 'monthly')
- amount (numeric)
- logo (text/url)
- bgcolor (text)
- color (text)
- font_size (text)
- donation (jsonb/array)
- paying_users (jsonb/array or separate table)
- disabled (boolean)
- created_at (timestamp)
- updated_at (timestamp)

-- videos table
- id (uuid, primary key)
- playback_id (text, unique)
- creator_id (text)
- asset_name (text)
- view_mode (text)
- amount (numeric)
- donation (jsonb/array)
- paying_users (jsonb/array or separate table)
- disabled (boolean)
- created_at (timestamp)
- updated_at (timestamp)

-- users table
- id (uuid, primary key)
- creator_address (text, unique) -- wallet address
- display_name (text)
- bio (text)
- avatar (text/url)
- social_links (jsonb)
- theme (jsonb)
- is_public (boolean)
- created_at (timestamp)
- updated_at (timestamp)

-- chats table
- id (uuid, primary key)
- stream_id (text) -- playbackId
- sender (text)
- wallet_address (text)
- message (text)
- timestamp (timestamp)
- created_at (timestamp)
```

### Migration Strategy

#### Phase 1: Create Supabase Service Layer
1. Create utility functions for Supabase operations
2. Define TypeScript interfaces matching Supabase schema
3. Create helper functions for common operations (CRUD)

#### Phase 2: Migrate Stream Operations
1. Update `streamAPI.ts` to use Supabase instead of backend API
2. Update `useStreamGate.ts` to fetch from Supabase
3. Update `Popup.tsx` and `Dialog.tsx` for stream operations
4. Update `ChannelSelector.tsx` for stream disable operations

#### Phase 3: Migrate Video Operations
1. Update `UploadVideoAsset.tsx` to save to Supabase
2. Update `useAssetGate.ts` to fetch from Supabase
3. Update `Popup.tsx` for video deletion
4. Update `ChannelSelector.tsx` for video disable operations

#### Phase 4: Migrate Profile Operations
1. Update `profileAPI.ts` to use Supabase
2. Update `CreatorProfile.tsx` to fetch from Supabase
3. Ensure profile creation/update works with Supabase

#### Phase 5: Migrate Chat Operations
1. Update `chatAPI.ts` to use Supabase
2. Implement real-time subscriptions for chat (Supabase real-time feature)
3. Test chat functionality end-to-end

#### Phase 6: Cleanup
1. Remove `backendApi.ts` utility file
2. Remove all references to `chaintv.onrender.com`
3. Update error handling for Supabase-specific errors
4. Test all functionality thoroughly

### Key Considerations

1. **Real-time Features**: Supabase supports real-time subscriptions - can enhance chat with real-time updates
2. **Row Level Security (RLS)**: Should implement RLS policies for data access control
3. **Relationships**: May need to handle relationships between tables (e.g., paying_users as separate table or JSONB)
4. **Data Migration**: If existing data exists in old backend, need migration script
5. **Error Handling**: Supabase errors differ from REST API errors - need to update error handling
6. **Type Safety**: Create proper TypeScript interfaces for Supabase responses

### Files That Need Changes

#### Core API Files:
- `src/features/streamAPI.ts` - Major changes
- `src/features/profileAPI.ts` - Major changes
- `src/features/chatAPI.ts` - Major changes
- `src/features/assetsAPI.ts` - Minor changes (only if asset metadata stored)

#### Hooks:
- `src/app/hook/useStreamGate.ts` - Major changes
- `src/app/hook/useAssetGate.ts` - Major changes

#### Components:
- `src/components/UploadVideoAsset.tsx` - Update video metadata saving
- `src/components/Popup.tsx` - Update delete operations
- `src/components/Dialog.tsx` - Update stream update operation
- `src/components/templates/creator/CreatorProfile.tsx` - Update profile fetching
- `src/components/templates/monetization/Tabs/Store/*` - May need product table
- `src/components/templates/monetization/Tabs/ChannelSelector.tsx` - Update disable operations

#### Utilities:
- `src/utils/backendApi.ts` - Can be removed after migration
- `supabase.ts` - Already exists, may need helper functions

### Success Criteria

1. All stream operations work with Supabase
2. All video operations work with Supabase
3. All profile operations work with Supabase
4. All chat operations work with Supabase (with real-time if possible)
5. No references to `chaintv.onrender.com` remain
6. All existing functionality preserved
7. Error handling works correctly
8. Type safety maintained throughout

## High-level Task Breakdown: Supabase Migration

### Phase 1: Create Supabase Service Layer & Type Definitions
- [ ] **Task 1.1**: Review existing Supabase table schemas (confirm with user if needed)
- [ ] **Task 1.2**: Create TypeScript interfaces for Supabase tables (streams, videos, users, chats)
- [ ] **Task 1.3**: Create Supabase service utility functions in `src/lib/supabase.ts` or similar
- [ ] **Task 1.4**: Create helper functions for common CRUD operations
- [ ] **Task 1.5**: Set up error handling utilities for Supabase errors
- **Success Criteria**: Type-safe interfaces exist, helper functions work, error handling is consistent

### Phase 2: Migrate Stream Operations
- [ ] **Task 2.1**: Update `createLivestream` in `streamAPI.ts` to save to Supabase `streams` table
- [ ] **Task 2.2**: Update `getAllStreams` in `streamAPI.ts` to fetch from Supabase instead of backend
- [ ] **Task 2.3**: Update `useStreamGate.ts` to fetch stream details from Supabase
- [ ] **Task 2.4**: Update `useStreamGate.ts` to add paying users to Supabase
- [ ] **Task 2.5**: Update `Popup.tsx` to delete streams from Supabase
- [ ] **Task 2.6**: Update `Dialog.tsx` to update streams in Supabase
- [ ] **Task 2.7**: Update `ChannelSelector.tsx` to disable streams in Supabase
- [ ] **Task 2.8**: Test all stream operations end-to-end
- **Success Criteria**: All stream CRUD operations work with Supabase, paying users can be added, streams can be disabled

### Phase 3: Migrate Video Operations
- [ ] **Task 3.1**: Update `UploadVideoAsset.tsx` to save video metadata to Supabase `videos` table
- [ ] **Task 3.2**: Update `useAssetGate.ts` to fetch video details from Supabase
- [ ] **Task 3.3**: Update `Popup.tsx` to delete videos from Supabase
- [ ] **Task 3.4**: Update `ChannelSelector.tsx` to disable videos in Supabase
- [ ] **Task 3.5**: Test all video operations end-to-end
- **Success Criteria**: All video CRUD operations work with Supabase, videos can be disabled

### Phase 4: Migrate Profile Operations
- [ ] **Task 4.1**: Update `fetchProfile` in `profileAPI.ts` to fetch from Supabase `users` table
- [ ] **Task 4.2**: Update `updateProfile` in `profileAPI.ts` to update Supabase
- [ ] **Task 4.3**: Update `createProfile` in `profileAPI.ts` to create in Supabase
- [ ] **Task 4.4**: Update `CreatorProfile.tsx` to fetch from Supabase
- [ ] **Task 4.5**: Test profile operations end-to-end
- **Success Criteria**: Profile CRUD operations work with Supabase, profiles display correctly

### Phase 5: Migrate Chat Operations
- [ ] **Task 5.1**: Update `sendChatMessage` in `chatAPI.ts` to insert into Supabase `chats` table
- [ ] **Task 5.2**: Update `fetchChatMessages` in `chatAPI.ts` to fetch from Supabase
- [ ] **Task 5.3**: Update `fetchRecentMessages` in `chatAPI.ts` to fetch from Supabase with pagination
- [ ] **Task 5.4**: Implement Supabase real-time subscription for chat (optional enhancement)
- [ ] **Task 5.5**: Update chat components to use new Supabase functions
- [ ] **Task 5.6**: Test chat functionality end-to-end
- **Success Criteria**: Chat messages can be sent and fetched, real-time updates work (if implemented)

### Phase 6: Cleanup & Final Testing
- [ ] **Task 6.1**: Remove `backendApi.ts` utility file
- [ ] **Task 6.2**: Remove all direct references to `chaintv.onrender.com` (grep and remove)
- [ ] **Task 6.3**: Update error messages to be Supabase-specific where needed
- [ ] **Task 6.4**: Run full application test suite
- [ ] **Task 6.5**: Test all user flows (create stream, upload video, update profile, send chat)
- [ ] **Task 6.6**: Verify no console errors or warnings related to old backend
- **Success Criteria**: No references to old backend remain, all functionality works, no errors in console