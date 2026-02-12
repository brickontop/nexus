
export interface User {
  username: string;
  email?: string;
  avatar: string;
  joinedAt: number;
  isVerified?: boolean;
  coins: number;
  tagColor?: string;
  roles?: string[];
  equippedRole?: string; // The currently active role prefix
  unlockedColors?: string[]; // Tracks purchased colors
  badges?: string[];
  warnings?: number;
  banUntil?: number;
  nameChangeCount?: number;
}

export interface Message {
  id: string;
  sender: string;
  senderAvatar?: string;
  tagColor?: string;
  equippedRole?: string; // Captured at the time of sending
  text: string;
  imageUrl?: string;
  soundEffect?: string; // Key for the sound to play
  timestamp: number;
  channelId: string;
  isAI?: boolean;
  isVerified?: boolean;
  recipient?: string; // If set, only this user sees the message
  roles?: string[];
}

export enum ChannelType {
  GENERAL = 'general',
  GOSSIP = 'gossip',
  AI = 'ai',
  FORM = 'form',
  TICKET = 'ticket'
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  type: ChannelType;
  icon: string;
  owner?: string; // Used for tickets
}

export interface SupportSubmission {
  id: string;
  username: string;
  need: string;
  details: string;
  timestamp: number;
  status: 'pending' | 'opened' | 'closed';
}

export interface SuggestionSubmission {
  id: string;
  username: string;
  want: string;
  why: string;
  timestamp: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
