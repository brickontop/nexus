
import { Channel, ChannelType } from './types';

// Custom SVG for the Nexus "N" Logo - Clean, transparent stylized "N"
export const NEXUS_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNMjAgODBWMjBoMTVsMzAgNDBWMjBoMTV2NjBINjVMMzUgNDB2NDBIMjB6IiBmaWxsPSIjNTg2NUYyIi8+PC9zdmc+`;

export const SOUNDS: Record<string, string> = {
  duck: 'https://assets.mixkit.co/active_storage/sfx/1000/1000-preview.mp3',
  honk: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  clap: 'https://assets.mixkit.co/active_storage/sfx/3011/3011-preview.mp3',
  cash: 'https://assets.mixkit.co/active_storage/sfx/1703/1703-preview.mp3'
};

export const CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    description: 'Main hangout for everyone. Keep it chill!',
    type: ChannelType.GENERAL,
    icon: 'text'
  },
  {
    id: 'announcements',
    name: 'announcements',
    description: 'Official updates from the Nexus administration.',
    type: ChannelType.GENERAL,
    icon: 'megaphone'
  },
  {
    id: 'mod-actions',
    name: 'mod-actions',
    description: 'Confidential logs of administrative actions. Admins only.',
    type: ChannelType.GENERAL,
    icon: 'shield'
  },
  {
    id: 'talk-to-brick',
    name: 'talk-to-brick',
    description: 'Need help or want to chat with an admin? Submit a form here.',
    type: ChannelType.FORM,
    icon: 'form'
  },
  {
    id: 'suggestions',
    name: 'suggestions',
    description: 'Have an idea for Nexus? Tell us what you want and why!',
    type: ChannelType.FORM,
    icon: 'lightbulb'
  },
  {
    id: 'gossip',
    name: 'gossip',
    description: 'The place for rumors and tea.',
    type: ChannelType.GOSSIP,
    icon: 'text'
  },
  {
    id: 'ai',
    name: 'ai-chat',
    description: 'Chat with the Nexus AI.',
    type: ChannelType.AI,
    icon: 'bot'
  }
];

export const STORAGE_KEYS = {
  USERS: 'nexus_users_db',
  MESSAGES: 'nexus_messages_v1',
  SESSION: 'nexus_current_session',
  SUBMISSIONS: 'nexus_support_submissions',
  SUGGESTIONS: 'nexus_suggestions_v1',
  TICKETS: 'nexus_active_tickets'
};
