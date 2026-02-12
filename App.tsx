
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, AuthState, SupportSubmission, SuggestionSubmission, Channel, ChannelType } from './types';
import { CHANNELS, STORAGE_KEYS, NEXUS_LOGO_SVG, SOUNDS } from './constants';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AdminPanel from './components/AdminPanel';
import ShopModal from './components/ShopModal';
import SettingsModal from './components/SettingsModal';
import InventoryModal from './components/InventoryModal';
import { filterProfanity, isMessageSafe } from './utils/filter';
import { checkImageSafety } from './services/geminiService';

const OWNER_NAME = "Brick";
const IMAGE_VIOLATION_TIMEOUT_MS = 300000; // 5 minutes

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false
  });
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [submissions, setSubmissions] = useState<SupportSubmission[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionSubmission[]>([]);
  const [tickets, setTickets] = useState<Channel[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [coinMultiplier, setCoinMultiplier] = useState(1);
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);
  const [timeoutReason, setTimeoutReason] = useState<string | null>(null);
  
  const messageHistoryRef = useRef<number[]>([]);
  const lastPlayedSoundRef = useRef<string | null>(null);

  useEffect(() => {
    if (isDiscoMode) {
      document.body.classList.add('disco-mode');
    } else {
      document.body.classList.remove('disco-mode');
    }
  }, [isDiscoMode]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.soundEffect && latestMessage.id !== lastPlayedSoundRef.current) {
      if (Date.now() - latestMessage.timestamp < 2000) {
        const audioUrl = SOUNDS[latestMessage.soundEffect];
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.volume = 0.5;
          audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
          lastPlayedSoundRef.current = latestMessage.id;
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    const initApp = () => {
      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (savedSession) {
        try {
          const user: User = JSON.parse(savedSession);
          if (user && user.username) {
            const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
            if (usersData) {
              const db = JSON.parse(usersData);
              const userInDb = db[user.username.toLowerCase()];
              if (userInDb) {
                setAuthState({ 
                  user: { 
                    ...user, 
                    isVerified: userInDb.isVerified,
                    coins: userInDb.coins || 0,
                    tagColor: userInDb.tagColor,
                    roles: userInDb.roles || [],
                    equippedRole: userInDb.equippedRole,
                    unlockedColors: userInDb.unlockedColors || ['white'],
                    badges: userInDb.badges || [],
                    warnings: userInDb.warnings || 0,
                    nameChangeCount: userInDb.nameChangeCount || 0
                  }, 
                  isAuthenticated: true 
                });
              } else {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
              }
            }
          }
        } catch (e) { localStorage.removeItem(STORAGE_KEYS.SESSION); }
      }
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) { try { setMessages(JSON.parse(savedMessages)); } catch (e) {} }
      
      const savedSubmissions = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (savedSubmissions) { try { setSubmissions(JSON.parse(savedSubmissions)); } catch (e) {} }

      const savedSuggestions = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
      if (savedSuggestions) { try { setSuggestions(JSON.parse(savedSuggestions)); } catch (e) {} }

      const savedTickets = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (savedTickets) { try { setTickets(JSON.parse(savedTickets)); } catch (e) {} }

      const savedMult = localStorage.getItem('nexus_coin_mult');
      if (savedMult) setCoinMultiplier(parseFloat(savedMult));
      setIsAppLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!isAppLoading) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    }
  }, [messages, submissions, suggestions, tickets, isAppLoading]);

  const handleLogin = (user: User) => {
    const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
    let isVerified = false; let coins = 0; let roles = []; let badges = []; let nameChangeCount = 0;
    let unlockedColors = ['white'];
    let equippedRole = undefined;
    if (usersData) {
      const db = JSON.parse(usersData);
      const record = db[user.username.toLowerCase()];
      if (record) {
        isVerified = !!record.isVerified;
        coins = record.coins || 0;
        roles = record.roles || [];
        equippedRole = record.equippedRole;
        badges = record.badges || [];
        nameChangeCount = record.nameChangeCount || 0;
        unlockedColors = record.unlockedColors || ['white'];
      }
    }
    const updatedUser = { ...user, isVerified, coins, roles, equippedRole, badges, nameChangeCount, unlockedColors };
    setAuthState({ user: updatedUser, isAuthenticated: true });
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser));
  };

  const logModAction = useCallback((text: string) => {
    const logMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'NEXUS-AUDIT',
      text: text,
      timestamp: Date.now(),
      channelId: 'mod-actions'
    };
    setMessages(prev => [...prev, logMsg]);
  }, []);

  const handleLogout = useCallback((reason: string = "Logged out.") => {
    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setLogoutNotice(reason);
    setTimeout(() => setLogoutNotice(null), 5000);
  }, []);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser));
    const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
    if (usersData) {
      const db = JSON.parse(usersData);
      const normalized = updatedUser.username.toLowerCase();
      if (db[normalized]) {
        db[normalized] = { ...db[normalized], ...updatedUser };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db));
      }
    }
  }, []);

  const handleGrantRole = useCallback((roleName: string) => {
    setAuthState(prev => {
      if (prev.user && !prev.user.roles?.includes(roleName)) {
        const updated = {
          ...prev.user,
          roles: Array.from(new Set([...(prev.user.roles || []), roleName]))
        };
        handleUpdateUser(updated);
        return { ...prev, user: updated };
      }
      return prev;
    });
  }, [handleUpdateUser]);

  const handleUpdateInfo = async (updates: { email?: string; password?: string; newUsername?: string; cost?: number }) => {
    if (!authState.user) return "Not authenticated.";
    const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersData) return "Critical error accessing database.";
    const db = JSON.parse(usersData);
    const oldUsernameNormalized = authState.user.username.toLowerCase();
    const oldRecord = db[oldUsernameNormalized];

    if (!oldRecord) return "User record not found.";

    let newUser = { ...authState.user };

    if (updates.newUsername) {
      const newUsernameNormalized = updates.newUsername.toLowerCase();
      if (newUsernameNormalized !== oldUsernameNormalized && db[newUsernameNormalized]) {
        return "Username already taken.";
      }
      
      const safetyCheck = isMessageSafe(updates.newUsername);
      if (!safetyCheck.safe) {
        return `Username restricted (${safetyCheck.reason}).`;
      }

      newUser.username = updates.newUsername;
      newUser.coins -= updates.cost || 0;
      newUser.nameChangeCount = (newUser.nameChangeCount || 0) + 1;
      const recordData = { ...oldRecord, ...newUser };
      if (updates.password) recordData.password = updates.password;
      if (updates.email) recordData.email = updates.email;
      db[newUsernameNormalized] = recordData;
      delete db[oldUsernameNormalized];
      logModAction(`User ${oldUsernameNormalized} renamed themselves to ${updates.newUsername}. Cost: ${updates.cost}`);
    } else {
      if (updates.email) newUser.email = updates.email;
      const recordData = { ...oldRecord, ...newUser };
      if (updates.password) recordData.password = updates.password;
      db[oldUsernameNormalized] = recordData;
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db));
    setAuthState({ user: newUser, isAuthenticated: true });
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));

    return null;
  };

  const executeAdminAction = (action: string, targetUsername: string | undefined, value: any = 0, reason: string = "No reason provided") => {
    if (authState.user?.username !== OWNER_NAME) return false;
    const cmd = action.toLowerCase();
    const rawTarget = targetUsername?.trim() || "";
    const normalizedTarget = rawTarget.toLowerCase();
    const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersData) return false;
    const db = JSON.parse(usersData);

    switch (cmd) {
      case 'givecoins':
        const coinAmount = parseInt(value);
        if (normalizedTarget === 'all') {
          Object.keys(db).forEach(k => db[k].coins = (db[k].coins || 0) + coinAmount);
          if (authState.user) handleUpdateUser({ ...authState.user, coins: (authState.user.coins || 0) + coinAmount });
          logModAction(`Admin Brick granted ${coinAmount} coins to EVERYONE.`);
        } else if (db[normalizedTarget]) {
          db[normalizedTarget].coins = (db[normalizedTarget].coins || 0) + coinAmount;
          if (authState.user?.username.toLowerCase() === normalizedTarget) handleUpdateUser({ ...authState.user, coins: db[normalizedTarget].coins });
          logModAction(`Admin Brick granted ${coinAmount} coins to ${normalizedTarget}.`);
        }
        break;
      case 'givebadge':
        const badgeName = value.toString();
        if (normalizedTarget === 'all') {
          Object.keys(db).forEach(k => db[k].badges = Array.from(new Set([...(db[k].badges || []), badgeName])));
          if (authState.user) handleUpdateUser({ ...authState.user, badges: Array.from(new Set([...(authState.user.badges || []), badgeName])) });
          logModAction(`Admin Brick granted badge [${badgeName}] to EVERYONE.`);
        } else if (db[normalizedTarget]) {
          db[normalizedTarget].badges = Array.from(new Set([...(db[normalizedTarget].badges || []), badgeName]));
          if (authState.user?.username.toLowerCase() === normalizedTarget) handleUpdateUser({ ...authState.user, badges: db[normalizedTarget].badges });
          logModAction(`Admin Brick granted badge [${badgeName}] to ${normalizedTarget}.`);
        }
        break;
      case 'deleteaccount':
        if (db[normalizedTarget]) {
          delete db[normalizedTarget];
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db));
          logModAction(`Admin Brick DELETED account: ${normalizedTarget}. Reason: ${reason}`);
          if (authState.user?.username.toLowerCase() === normalizedTarget) {
            handleLogout(`Your account was deleted! Reason: ${reason}`);
          }
          return true;
        }
        break;
      case 'ban':
        if (db[normalizedTarget]) {
          db[normalizedTarget].isBanned = true;
          db[normalizedTarget].banReason = reason;
          logModAction(`Admin Brick BANNED user: ${normalizedTarget}. Reason: ${reason}`);
          if (authState.user?.username.toLowerCase() === normalizedTarget) handleLogout(`Banned: ${reason}`);
        }
        break;
      default: return false;
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db));
    return true;
  };

  const handleImageUpload = async (imageData: string) => {
    if (!authState.user) return;
    if (timeoutUntil && Date.now() < timeoutUntil) return;

    const safetyCheck = await checkImageSafety(imageData);
    
    if (!safetyCheck.safe) {
      const newWarnings = (authState.user.warnings || 0) + 1;
      const timeoutEnd = Date.now() + IMAGE_VIOLATION_TIMEOUT_MS;
      
      if (newWarnings >= 3) {
        const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
        if (usersData) {
          const db = JSON.parse(usersData);
          const normalized = authState.user.username.toLowerCase();
          if (db[normalized]) {
            db[normalized].isBanned = true;
            db[normalized].banReason = "3 Strike Policy: Persistent Image Safety Violations.";
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db));
          }
        }
        logModAction(`AUTO-BAN: User ${authState.user.username} permanently banned for reaching 3 strikes.`);
        handleLogout("Account Permanently Banned: Excessive safety violations.");
      } else {
        handleUpdateUser({ ...authState.user, warnings: newWarnings });
        setTimeoutUntil(timeoutEnd);
        setTimeoutReason(`Image Policy Violation (${safetyCheck.reason})`);
        
        logModAction(`AUTO-TIMEOUT: User ${authState.user.username} timed out for 5 minutes. Violation: ${safetyCheck.reason} content (Strike ${newWarnings}/3).`);

        const sysMsg: Message = {
          id: crypto.randomUUID(), 
          sender: 'SYSTEM', 
          text: `STRIKE ${newWarnings}/3: Your image was removed for containing ${safetyCheck.reason} content. You have been timed out for 5 minutes.`,
          timestamp: Date.now(), 
          channelId: activeChannelId, 
          recipient: authState.user.username
        };
        setMessages(prev => [...prev, sysMsg]);
      }
      return;
    }
    
    const newMessage: Message = {
      id: crypto.randomUUID(), 
      sender: authState.user.username, 
      senderAvatar: authState.user.avatar,
      text: "", 
      imageUrl: imageData, 
      timestamp: Date.now(), 
      channelId: activeChannelId,
      equippedRole: authState.user.equippedRole, 
      tagColor: authState.user.tagColor
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = useCallback((text: string, isAI: boolean = false) => {
    const now = Date.now();
    if (!isAI && timeoutUntil && now < timeoutUntil) return;

    if (!isAI && authState.user?.username !== OWNER_NAME) {
      const safetyCheck = isMessageSafe(text);
      if (!safetyCheck.safe) {
        let displayReason = safetyCheck.reason;
        if (displayReason === 'profanity') displayReason = "Inappropriate Language";
        if (displayReason === 'politics') displayReason = "Political Discussion Prohibited";
        if (displayReason === 'personalInfo') displayReason = "Sharing Personal Info Prohibited";
        if (displayReason === 'dangerous') displayReason = "Dangerous Activity/Bypass Prohibited";
        if (displayReason === 'adult') displayReason = "Adult Content Prohibited";

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: 'SYSTEM',
          text: `Nexus Policy (${displayReason}): Your message contained prohibited content.`,
          timestamp: now,
          channelId: activeChannelId,
          recipient: authState.user?.username
        }]);
        return;
      }

      const newHistory = [...messageHistoryRef.current, now].slice(-3);
      messageHistoryRef.current = newHistory;
      if (newHistory.length === 3) {
        const diff = newHistory[2] - newHistory[0];
        if (diff <= 5000) {
          const timeoutTime = now + 60000;
          setTimeoutUntil(timeoutTime);
          setTimeoutReason("Spamming");
          logModAction(`AUTO-TIMEOUT: User ${authState.user?.username} timed out for 1 minute (Spamming).`);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'SYSTEM',
            text: "Slow down! You've been timed out for 1 minute due to spamming.",
            timestamp: now,
            channelId: activeChannelId,
            recipient: authState.user?.username
          }]);
          return;
        }
      }
    }

    const isAdmin = authState.user?.username === OWNER_NAME;
    if (text.startsWith('/')) {
      if (!isAdmin) return;
      const [cmd, target, ...rest] = text.split(' ');
      const reason = rest.join(' ');
      if (cmd === '/deleteaccount') {
        executeAdminAction('deleteaccount', target, 0, reason || "Admin policy");
        return;
      }
      if (cmd === '/givebadge') {
        executeAdminAction('givebadge', target, rest[0] || "Unknown");
        return;
      }
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      sender: isAI ? 'Nexus AI' : authState.user?.username || 'Guest',
      senderAvatar: isAI ? NEXUS_LOGO_SVG : authState.user?.avatar,
      text: filterProfanity(text),
      timestamp: now,
      channelId: activeChannelId,
      isAI,
      isVerified: isAI || authState.user?.isVerified,
      tagColor: isAI ? undefined : authState.user?.tagColor,
      equippedRole: isAI ? undefined : authState.user?.equippedRole
    };
    setMessages(prev => [...prev, newMessage]);
    if (authState.user && !isAI) handleUpdateUser({ ...authState.user, coins: authState.user.coins + Math.floor(5 * coinMultiplier) });
  }, [activeChannelId, authState.user, coinMultiplier, timeoutUntil, handleUpdateUser, logModAction]);

  const handleGlobalBroadcast = (text: string) => {
    const timestamp = Date.now();
    const broadcastMessages: Message[] = CHANNELS.map(ch => ({
      id: crypto.randomUUID(),
      sender: 'SYSTEM',
      text: text,
      timestamp: timestamp,
      channelId: ch.id
    }));
    setMessages(prev => [...prev, ...broadcastMessages]);
    logModAction(`GLOBAL BROADCAST by Admin Brick: "${text}"`);
  };

  const handleSoundBroadcast = (soundKey: string, global: boolean) => {
    const timestamp = Date.now();
    const label = soundKey.toUpperCase();
    
    if (global) {
      const soundMessages: Message[] = CHANNELS.map(ch => ({
        id: crypto.randomUUID(),
        sender: 'SYSTEM',
        text: `🔊 Nexus Audio Protocol: Admin "Brick" triggered sound [${label}] server-wide.`,
        soundEffect: soundKey,
        timestamp: timestamp,
        channelId: ch.id
      }));
      setMessages(prev => [...prev, ...soundMessages]);
      logModAction(`GLOBAL SOUND triggered by Admin Brick: [${label}]`);
    } else {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'SYSTEM',
        text: `🔊 Local Audio Protocol: Admin "Brick" triggered sound [${label}] in this channel.`,
        soundEffect: soundKey,
        timestamp: timestamp,
        channelId: activeChannelId
      }]);
      logModAction(`LOCAL SOUND triggered by Admin Brick in #${activeChannelId}: [${label}]`);
    }
  };

  const handleFormSubmission = (data: any) => {
    if (!authState.user) return;
    
    if (activeChannelId === 'suggestions') {
      const sug: SuggestionSubmission = {
        id: crypto.randomUUID(),
        username: authState.user.username,
        want: data.want,
        why: data.why,
        timestamp: Date.now()
      };
      setSuggestions(prev => [...prev, sug]);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'SYSTEM',
        text: "Suggestion logged! Thanks for helping Nexus grow.",
        timestamp: Date.now(),
        channelId: 'suggestions',
        recipient: authState.user?.username
      }]);
    } else if (activeChannelId === 'talk-to-brick') {
      const sub: SupportSubmission = {
        id: crypto.randomUUID(),
        username: authState.user.username,
        need: data.need,
        details: data.details,
        timestamp: Date.now(),
        status: 'pending'
      };
      setSubmissions(prev => [...prev, sub]);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'SYSTEM',
        text: "Support request sent! An admin will review it soon.",
        timestamp: Date.now(),
        channelId: 'talk-to-brick',
        recipient: authState.user?.username
      }]);
    }
  };

  const handleOpenTicket = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub || sub.status === 'opened') return;

    const ticketChannel: Channel = {
      id: `ticket-${sub.username}-${Date.now()}`,
      name: `Ticket: ${sub.username}`,
      description: `1-1 conversation with ${sub.username}`,
      type: ChannelType.TICKET,
      icon: 'lock',
      owner: sub.username
    };

    setTickets(prev => [...prev, ticketChannel]);
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'opened' } : s));
    setActiveChannelId(ticketChannel.id);
    logModAction(`Support Ticket OPENED for user: ${sub.username}`);
  };

  const handleCloseTicket = (ticketId: string) => {
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setActiveChannelId('general');
    logModAction(`Support Ticket CLOSED: ${ticketId}`);
  };

  if (isAppLoading) return <div className="h-screen w-screen flex items-center justify-center bg-[#313338]"><div className="w-10 h-10 border-4 border-t-[#5865f2] rounded-full animate-spin"></div></div>;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#313338] relative">
      {!authState.isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <>
          <Sidebar 
            activeChannelId={activeChannelId} 
            onChannelSelect={setActiveChannelId} 
            currentUser={authState.user} 
            onLogout={() => handleLogout()} 
            onUpdateUser={handleUpdateUser} 
            onOpenShop={() => setShowShopModal(true)} 
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenInventory={() => setShowInventoryModal(true)}
            dynamicTickets={tickets.filter(t => authState.user?.username === OWNER_NAME || t.owner === authState.user?.username)}
          />
          <main className="flex-1 flex flex-col min-w-0 relative h-full">
            <ChatArea 
              activeChannel={[...CHANNELS, ...tickets].find(c => c.id === activeChannelId)!} 
              messages={messages.filter(m => m.channelId === activeChannelId)} 
              onSendMessage={sendMessage} 
              onImageUpload={handleImageUpload} 
              onGrantRole={handleGrantRole}
              onFormSubmit={handleFormSubmission}
              onOpenTicket={handleOpenTicket}
              onCloseTicket={handleCloseTicket}
              currentUser={authState.user} 
              timeoutUntil={timeoutUntil}
              timeoutReason={timeoutReason}
              onTimeoutEnd={() => { setTimeoutUntil(null); setTimeoutReason(null); }}
              submissions={submissions}
              suggestions={suggestions}
            />
            {authState.user?.username === OWNER_NAME && (
              <AdminPanel 
                isDiscoMode={isDiscoMode} 
                onToggleDisco={() => setIsDiscoMode(!isDiscoMode)} 
                onAction={executeAdminAction} 
                onBroadcast={handleGlobalBroadcast}
                onSoundBroadcast={handleSoundBroadcast}
              />
            )}
          </main>
          {showShopModal && authState.user && <ShopModal user={authState.user} onClose={() => setShowShopModal(false)} onUpdateUser={handleUpdateUser} />}
          {showSettingsModal && authState.user && <SettingsModal user={authState.user} onClose={() => setShowSettingsModal(false)} onUpdateInfo={handleUpdateInfo} />}
          {showInventoryModal && authState.user && <InventoryModal user={authState.user} onClose={() => setShowInventoryModal(false)} onUpdateUser={handleUpdateUser} />}
        </>
      )}
      {logoutNotice && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] bg-[#111214] text-white px-8 py-4 rounded-full border border-white/10 text-xs font-bold shadow-2xl">
          {logoutNotice}
        </div>
      )}
    </div>
  );
};

export default App;
