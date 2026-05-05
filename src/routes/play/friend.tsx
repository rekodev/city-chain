import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ChannelProvider,
  useAbly,
  useConnectionStateListener,
  usePresence,
  usePresenceListener
} from 'ably/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  CircleDot,
  Copy,
  Crown,
  Flag,
  Loader2,
  PlayCircle,
  Timer,
  TriangleAlert,
  UserRound,
  Users
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import { toast } from 'sonner';
import ChainStrip from '@/components/game/ChainStrip';
import CityInput from '@/components/game/CityInput';
import GameOverScreen from '@/components/game/GameOverScreen';
import PlayerCard from '@/components/game/PlayerCard';
import WorldMap from '@/components/game/WorldMap';
import { useGameStatus } from '@/context/gameStatus';
import { authClient } from '@/lib/auth-client';
import { useScrollLock } from '@/hooks/useScrollLock';
import { type GameOverReason } from '@/hooks/useGameState';
import { getInitialFriendRoomSnapshot } from '@/server/friend-room';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PATH } from '#/constants/path';
import { type ChainEntry, type CityData } from '@/types/city';

type FriendSearch = {
  room?: string;
  host?: '1';
  hostName?: string;
};

type Participant = {
  name: string;
  subtitle: string;
  image?: string | null;
};

type LobbyPresenceData = {
  roomId: string;
  role: 'host' | 'guest';
  name: string;
  subtitle: string;
  image?: string | null;
  isAuthenticated: boolean;
};

type RoomSnapshot = {
  roomId: string;
  roomStatus: 'waiting' | 'ready' | 'active' | 'finished' | 'abandoned';
  gameStatus: 'waiting' | 'active' | 'finished';
  participants: Array<{
    id: string;
    role: 'host' | 'player';
    slot: 0 | 1;
    displayName: string;
    isGuest: boolean;
    isReady: boolean;
    userId: string | null;
  }>;
  viewer: {
    participantId: string;
    role: 'host' | 'player';
    slot: 0 | 1;
  } | null;
  chain: ChainEntry[];
  timers: [number, number];
  currentTurnSlot: 0 | 1;
  version: number;
  gameOverReason: 'timeout' | 'gave_up' | 'disconnect' | 'completed' | null;
  startedAt: string | null;
  endedAt: string | null;
  lastMoveAt: string | null;
  rematchRequestedBySlot: 0 | 1 | null;
};

export const Route = createFileRoute('/play/friend')({
  validateSearch: (search): FriendSearch => ({
    room:
      typeof search.room === 'string' && search.room.trim().length > 0
        ? search.room.trim()
        : undefined,
    host: search.host === '1' ? '1' : undefined,
    hostName:
      typeof search.hostName === 'string' && search.hostName.trim().length > 0
        ? search.hostName.trim().slice(0, 40)
        : undefined
  }),
  loaderDeps: ({ search }) => ({
    roomId: search.room ?? null
  }),
  loader: async ({ deps }) => ({
    initialRoomSnapshot: await getInitialFriendRoomSnapshot({
      data: deps.roomId
    })
  }),
  component: PlayFriendLobby
});

function makeRoomId() {
  const fromCrypto = globalThis.crypto
    ?.randomUUID?.()
    .replace(/-/g, '')
    .slice(0, 8);
  return (fromCrypto ?? Math.random().toString(36).slice(2, 10)).toUpperCase();
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getParticipantFromPresence(
  members: Array<{ clientId?: string; data?: unknown }>,
  roomId: string,
  role: LobbyPresenceData['role']
): Participant | undefined {
  for (const member of [...members].reverse()) {
    const data = member.data;

    if (!data || typeof data !== 'object') continue;

    const candidate = data as Partial<LobbyPresenceData>;
    if (
      candidate.roomId !== roomId ||
      candidate.role !== role ||
      !candidate.name
    ) {
      continue;
    }

    return {
      name: candidate.name,
      subtitle:
        candidate.subtitle ||
        (role === 'host' ? 'Hosting this lobby' : 'Joined via invite link'),
      image: candidate.image
    };
  }

  return undefined;
}

function getParticipantFromSnapshot(
  snapshot: RoomSnapshot | null,
  slot: 0 | 1,
  subtitle: string
): Participant | undefined {
  const participant = snapshot?.participants.find(
    (entry) => entry.slot === slot
  );

  if (!participant) return undefined;

  return {
    name: participant.displayName,
    subtitle,
    image: undefined
  };
}

function getRoomStatusDisplay(
  status: RoomSnapshot['roomStatus'] | 'creating' | 'waiting'
) {
  switch (status) {
    case 'creating':
      return {
        icon: Loader2,
        label: 'Creating',
        iconClassName: 'text-muted-foreground animate-spin'
      };
    case 'waiting':
      return { icon: Timer, label: 'Waiting', iconClassName: 'text-amber-400' };
    case 'ready':
      return {
        icon: CheckCircle2,
        label: 'Ready',
        iconClassName: 'text-green-400'
      };
    case 'active':
      return {
        icon: PlayCircle,
        label: 'Active',
        iconClassName: 'text-sky-400'
      };
    case 'finished':
      return {
        icon: Flag,
        label: 'Finished',
        iconClassName: 'text-muted-foreground'
      };
    case 'abandoned':
      return {
        icon: TriangleAlert,
        label: 'Abandoned',
        iconClassName: 'text-destructive'
      };
    default:
      return {
        icon: CircleDot,
        label: status,
        iconClassName: 'text-muted-foreground'
      };
  }
}

function formatConnectionState(state: string) {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'disconnected':
      return 'Reconnecting';
    default:
      return state;
  }
}

function getRequiredLetter(chain: ChainEntry[]) {
  if (chain.length === 0) return null;
  const lastCity = chain[chain.length - 1]?.city.name ?? '';
  return lastCity
    ? (lastCity[lastCity.length - 1]?.toUpperCase() ?? null)
    : null;
}

function getCountdownValue(snapshot: RoomSnapshot | null, now: number) {
  if (snapshot?.gameStatus !== 'active' || !snapshot.startedAt) return null;

  const elapsed = now - new Date(snapshot.startedAt).getTime();
  if (elapsed < 0) return 3;
  if (elapsed < 1000) return 3;
  if (elapsed < 2000) return 2;
  if (elapsed < 3000) return 1;
  if (elapsed < 3700) return 0;
  return null;
}

function getDerivedTimers(
  snapshot: RoomSnapshot | null,
  now: number
): [number, number] {
  if (!snapshot) return [60, 60];

  const timers: [number, number] = [...snapshot.timers];
  if (snapshot.gameStatus !== 'active' || !snapshot.lastMoveAt) return timers;

  const elapsedSeconds = Math.max(
    0,
    (now - new Date(snapshot.lastMoveAt).getTime()) / 1000
  );

  timers[snapshot.currentTurnSlot] = Math.max(
    0,
    Number((timers[snapshot.currentTurnSlot] - elapsedSeconds).toFixed(1))
  );

  return timers;
}

function getPlayers(snapshot: RoomSnapshot | null): [string, string] {
  const host = snapshot?.participants.find(
    (participant) => participant.slot === 0
  );
  const guest = snapshot?.participants.find(
    (participant) => participant.slot === 1
  );

  return [host?.displayName || 'Player 1', guest?.displayName || 'Player 2'];
}

function mapGameOverReason(
  reason: RoomSnapshot['gameOverReason']
): GameOverReason | null {
  if (reason === 'timeout') return 'timeout';
  if (reason === 'gave_up') return 'gaveUp';
  return null;
}

async function readRoomSnapshot(roomId: string) {
  const response = await fetch(
    `/api/multiplayer/room?room=${encodeURIComponent(roomId)}`
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || 'Failed to load room');
  }

  return (await response.json()) as RoomSnapshot;
}

async function writeRoomAction(
  body:
    | { action: 'ensure-host'; roomId: string; hostDisplayName: string }
    | { action: 'join'; roomId: string; displayName: string }
    | { action: 'start'; roomId: string }
    | { action: 'submit-move'; roomId: string; city: CityData }
    | { action: 'give-up'; roomId: string }
    | { action: 'resolve-timeout'; roomId: string }
    | { action: 'rematch'; roomId: string }
) {
  const response = await fetch('/api/multiplayer/room', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || 'Failed to update room');
  }

  return (await response.json()) as RoomSnapshot;
}

function ParticipantCard({
  label,
  participant,
  loading = false,
  empty = false,
  host = false
}: {
  label: string;
  participant?: Participant;
  loading?: boolean;
  empty?: boolean;
  host?: boolean;
}) {
  return (
    <div className="border-border/40 bg-card/65 flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm">
      {loading ? (
        <div className="bg-muted/70 size-10 shrink-0 animate-pulse rounded-full" />
      ) : participant ? (
        <Avatar size="lg">
          {participant.image ? (
            <AvatarImage src={participant.image} alt={participant.name} />
          ) : null}
          <AvatarFallback>
            {getInitials(participant.name) || 'P'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
          <UserRound size={18} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          <span>{label}</span>
          {host ? <Crown size={12} className="text-primary" /> : null}
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="bg-muted/70 h-4 w-28 animate-pulse rounded" />
            <div className="bg-muted/50 h-3 w-36 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className="text-foreground truncate text-sm font-semibold">
              {participant?.name ??
                (empty ? 'Waiting for player...' : 'Not joined')}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {participant?.subtitle ??
                (empty
                  ? 'A second player will appear here in step 2.'
                  : 'Invite link required')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PresenceMembership({
  channelName,
  data
}: {
  channelName: string;
  data: LobbyPresenceData;
}) {
  const { updateStatus } = usePresence(channelName, data);

  useEffect(() => {
    void updateStatus(data);
  }, [
    channelName,
    data,
    data.image,
    data.isAuthenticated,
    data.name,
    data.role,
    data.roomId,
    data.subtitle,
    updateStatus
  ]);

  return null;
}

function PlayFriendLobby() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { initialRoomSnapshot } = Route.useLoaderData();
  const { data: session, isPending: authIsPending } = authClient.useSession();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const sessionName = session?.user?.name?.trim() || '';
  const roomId = search.room;

  useEffect(() => {
    if (roomId) return;

    navigate({
      to: PATH.play.friend,
      search: {
        room: makeRoomId(),
        host: '1',
        hostName: sessionName || 'Host'
      },
      replace: true
    });
  }, [navigate, roomId, sessionName]);

  if (!roomId) {
    return (
      <div className="min-h-screen overflow-hidden">
        <WorldMap chain={[]} />
        <div className="relative z-10 flex min-h-screen items-center justify-center pt-14">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <Loader2 size={18} className="animate-spin" />
            <span>Creating your lobby...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="min-h-screen overflow-hidden">
        <WorldMap chain={[]} />
        <div className="relative z-10 flex min-h-screen items-center justify-center pt-14">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading room...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChannelProvider channelName={`multiplayer-room:${roomId}`}>
      <PlayFriendLobbyRoom
        roomId={roomId}
        isHost={search.host === '1'}
        hostName={search.hostName || sessionName || 'Host'}
        sessionName={sessionName}
        sessionEmail={session?.user?.email?.trim() || ''}
        sessionImage={session?.user?.image}
        authIsPending={authIsPending}
        initialRoomSnapshot={initialRoomSnapshot}
      />
    </ChannelProvider>
  );
}

function PlayFriendLobbyRoom({
  roomId,
  isHost,
  hostName,
  sessionName,
  sessionEmail,
  sessionImage,
  authIsPending,
  initialRoomSnapshot
}: {
  roomId: string;
  isHost: boolean;
  hostName: string;
  sessionName: string;
  sessionEmail: string;
  sessionImage?: string | null;
  authIsPending: boolean;
  initialRoomSnapshot: RoomSnapshot | null;
}) {
  const navigate = useNavigate();
  const ably = useAbly();
  const { setIsPlaying } = useGameStatus();

  const [guestName, setGuestName] = useState('');
  const [hasJoined, setHasJoined] = useState(
    initialRoomSnapshot?.viewer?.slot === 1
  );
  const [copied, setCopied] = useState(false);
  const [connectionState, setConnectionState] = useState(ably.connection.state);
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(
    initialRoomSnapshot
  );
  const [isBootstrappingRoom, setIsBootstrappingRoom] = useState(
    isHost && !initialRoomSnapshot
  );
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isStartingRoom, setIsStartingRoom] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isGivingUp, setIsGivingUp] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [focusCity, setFocusCity] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const channelName = `multiplayer-room:${roomId}`;
  const { presenceData } = usePresenceListener(channelName);
  const timeoutResolutionVersionRef = useRef<number | null>(null);
  const timeoutResolutionAttemptedRef = useRef<string | null>(null);

  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);
  });

  const presenceMembers = useMemo(
    () =>
      Array.isArray(presenceData)
        ? (presenceData as Array<{ clientId?: string; data?: unknown }>)
        : [],
    [presenceData]
  );

  const viewerSlot = roomSnapshot?.viewer?.slot ?? null;
  const players = useMemo(() => getPlayers(roomSnapshot), [roomSnapshot]);
  const derivedTimers = useMemo(
    () => getDerivedTimers(roomSnapshot, now),
    [now, roomSnapshot]
  );
  const countdown = useMemo(
    () => getCountdownValue(roomSnapshot, now),
    [now, roomSnapshot]
  );
  const requiredLetter = useMemo(
    () => getRequiredLetter(roomSnapshot?.chain ?? []),
    [roomSnapshot?.chain]
  );
  const isGameActive = roomSnapshot?.gameStatus === 'active';
  const isGameFinished = roomSnapshot?.gameStatus === 'finished';
  const isGameplayVisible = isGameActive || isGameFinished;
  const showLiveInput =
    isGameActive &&
    countdown === null &&
    viewerSlot !== null &&
    viewerSlot === roomSnapshot?.currentTurnSlot;

  useScrollLock(isGameplayVisible || countdown !== null);

  useEffect(() => {
    setIsPlaying(Boolean(isGameActive && countdown === null));
    return () => setIsPlaying(false);
  }, [countdown, isGameActive, setIsPlaying]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!isGameplayVisible) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(interval);
  }, [isGameplayVisible]);

  useEffect(() => {
    if (connectionState === 'connected') return;

    const interval = window.setInterval(() => {
      readRoomSnapshot(roomId)
        .then((snapshot) => setRoomSnapshot(snapshot))
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(interval);
  }, [connectionState, roomId]);

  const fallbackHostParticipant = useMemo<Participant>(
    () => ({
      name: isHost ? sessionName || 'You' : hostName,
      subtitle: isHost ? 'Hosting this lobby' : 'Host is preparing the lobby',
      image: isHost ? sessionImage : undefined
    }),
    [hostName, isHost, sessionImage, sessionName]
  );

  const liveHostParticipant = useMemo(
    () => getParticipantFromPresence(presenceMembers, roomId, 'host'),
    [presenceMembers, roomId]
  );
  const persistedHostParticipant = useMemo(
    () => getParticipantFromSnapshot(roomSnapshot, 0, 'Hosting this lobby'),
    [roomSnapshot]
  );

  const localGuestParticipant = useMemo<Participant | undefined>(() => {
    if (!hasJoined) return undefined;

    return sessionName
      ? {
          name: sessionName,
          subtitle: sessionEmail || 'Signed in player',
          image: sessionImage
        }
      : {
          name: guestName.trim(),
          subtitle: 'Guest player',
          image: undefined
        };
  }, [guestName, hasJoined, sessionEmail, sessionImage, sessionName]);

  const liveGuestParticipant = useMemo(
    () => getParticipantFromPresence(presenceMembers, roomId, 'guest'),
    [presenceMembers, roomId]
  );
  const persistedGuestParticipant = useMemo(
    () => getParticipantFromSnapshot(roomSnapshot, 1, 'Joined this lobby'),
    [roomSnapshot]
  );

  const hostParticipant =
    liveHostParticipant ?? persistedHostParticipant ?? fallbackHostParticipant;
  const guestParticipant =
    liveGuestParticipant ??
    persistedGuestParticipant ??
    (!isHost ? localGuestParticipant : undefined);

  const hasJoinedRoom = isHost || roomSnapshot?.viewer !== null || hasJoined;
  const shouldEnterPresence = hasJoinedRoom;
  const persistedGuestCount =
    roomSnapshot?.participants.filter((participant) => participant.slot === 1)
      .length ?? 0;
  const hasGuestInLobby = Boolean(guestParticipant) || persistedGuestCount > 0;
  const hostParticipantLoading =
    (authIsPending || isBootstrappingRoom) &&
    !liveHostParticipant &&
    !persistedHostParticipant;
  const guestParticipantLoading =
    isBootstrappingRoom && !liveGuestParticipant && !persistedGuestParticipant;
  const hostRoomStatus = getRoomStatusDisplay(
    roomSnapshot?.roomStatus ?? (isBootstrappingRoom ? 'creating' : 'waiting')
  );
  const guestRoomStatus = getRoomStatusDisplay(
    roomSnapshot?.roomStatus ?? 'waiting'
  );

  const localPresenceData = useMemo<LobbyPresenceData | null>(() => {
    if (!shouldEnterPresence) return null;

    if (isHost) {
      return {
        roomId,
        role: 'host',
        name: sessionName || hostName,
        subtitle: 'Hosting this lobby',
        image: sessionImage,
        isAuthenticated: Boolean(sessionName)
      };
    }

    return {
      roomId,
      role: 'guest',
      name: sessionName || guestName.trim(),
      subtitle: sessionName
        ? sessionEmail || 'Signed in player'
        : 'Guest player',
      image: sessionImage,
      isAuthenticated: Boolean(sessionName)
    };
  }, [
    guestName,
    hostName,
    isHost,
    roomId,
    sessionEmail,
    sessionImage,
    sessionName,
    shouldEnterPresence
  ]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';

    const params = new URLSearchParams({
      room: roomId,
      hostName
    });

    return `${window.location.origin}${PATH.play.friend}?${params.toString()}`;
  }, [hostName, roomId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapRoom = async () => {
      if (initialRoomSnapshot) return;

      if (isHost) {
        setIsBootstrappingRoom(true);

        try {
          const snapshot = await writeRoomAction({
            action: 'ensure-host',
            roomId,
            hostDisplayName: sessionName || hostName
          });

          if (!cancelled) {
            setRoomSnapshot(snapshot);
          }
        } catch (error) {
          if (!cancelled) {
            toast.error(
              error instanceof Error ? error.message : 'Failed to create room'
            );
          }
        } finally {
          if (!cancelled) {
            setIsBootstrappingRoom(false);
          }
        }

        return;
      }

      await readRoomSnapshot(roomId)
        .then((snapshot) => {
          if (!cancelled) {
            setRoomSnapshot(snapshot);
          }
        })
        .catch(() => null);
    };

    void bootstrapRoom();

    return () => {
      cancelled = true;
    };
  }, [hostName, initialRoomSnapshot, isHost, roomId, sessionName]);

  useEffect(() => {
    if (!liveGuestParticipant && !hasJoined) return;

    let cancelled = false;

    void readRoomSnapshot(roomId)
      .then((snapshot) => {
        if (!cancelled) {
          setRoomSnapshot(snapshot);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hasJoined, liveGuestParticipant, roomId]);

  useEffect(() => {
    const channel = ably.channels.get(channelName);

    const refreshSnapshot = () => {
      void readRoomSnapshot(roomId)
        .then((snapshot) => {
          setRoomSnapshot(snapshot);
        })
        .catch(() => {});
    };

    const refreshFromRoomEvent = (message: { data?: unknown }) => {
      const payload = message.data;
      if (!payload || typeof payload !== 'object') return;

      const eventRoomId = (payload as { roomId?: string }).roomId;
      if (eventRoomId !== roomId) return;

      refreshSnapshot();
    };

    const handleGameStarted = (message: { data?: unknown }) => {
      const payload = message.data;
      if (!payload || typeof payload !== 'object') return;

      const eventRoomId = (payload as { roomId?: string }).roomId;
      if (eventRoomId !== roomId) return;

      refreshSnapshot();
      toast.success('Game started');
    };

    const handleGameRematch = (message: { data?: unknown }) => {
      const payload = message.data;
      if (!payload || typeof payload !== 'object') return;

      const eventRoomId = (payload as { roomId?: string }).roomId;
      if (eventRoomId !== roomId) return;

      timeoutResolutionVersionRef.current = null;
      timeoutResolutionAttemptedRef.current = null;
      refreshSnapshot();
      toast.success('Rematch started!');
    };

    channel.subscribe('room.joined', refreshFromRoomEvent);
    channel.subscribe('game.updated', refreshFromRoomEvent);
    channel.subscribe('game.started', handleGameStarted);
    channel.subscribe('game.rematch', handleGameRematch);

    return () => {
      channel.unsubscribe('room.joined', refreshFromRoomEvent);
      channel.unsubscribe('game.updated', refreshFromRoomEvent);
      channel.unsubscribe('game.started', handleGameStarted);
      channel.unsubscribe('game.rematch', handleGameRematch);
    };
  }, [ably, channelName, roomId]);

  useEffect(() => {
    if (
      roomSnapshot?.gameStatus !== 'active' ||
      countdown !== null ||
      roomSnapshot.currentTurnSlot === undefined ||
      derivedTimers[roomSnapshot.currentTurnSlot] > 0
    ) {
      return;
    }

    if (timeoutResolutionVersionRef.current === roomSnapshot.version) {
      return;
    }

    const timeoutAttemptKey = `${roomId}:${roomSnapshot.version}:${roomSnapshot.startedAt ?? ''}`;
    if (timeoutResolutionAttemptedRef.current === timeoutAttemptKey) {
      return;
    }

    timeoutResolutionVersionRef.current = roomSnapshot.version;
    timeoutResolutionAttemptedRef.current = timeoutAttemptKey;

    void writeRoomAction({
      action: 'resolve-timeout',
      roomId
    })
      .then((snapshot) => {
        setRoomSnapshot(snapshot);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to resolve timeout'
        );
      });
  }, [countdown, derivedTimers, roomId, roomSnapshot]);

  const handleCopy = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Invite link copied');
  };

  const handleJoin = async () => {
    if (!sessionName && guestName.trim().length < 2) {
      toast.error('Enter a guest name to join this lobby');
      return;
    }

    setIsJoiningRoom(true);

    try {
      const snapshot = await writeRoomAction({
        action: 'join',
        roomId,
        displayName: sessionName || guestName.trim()
      });

      setRoomSnapshot(snapshot);
      setHasJoined(true);
      toast.success(
        sessionName
          ? 'Joined lobby as signed-in player'
          : 'Joined lobby as guest'
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to join lobby'
      );
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleStart = async () => {
    setIsStartingRoom(true);

    try {
      const snapshot = await writeRoomAction({
        action: 'start',
        roomId
      });

      setRoomSnapshot(snapshot);
      toast.success('Room marked active');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start room'
      );
    } finally {
      setIsStartingRoom(false);
    }
  };

  const handleSubmitCity = async (city: CityData) => {
    if (!roomSnapshot || viewerSlot === null) {
      return 'You are not part of this room';
    }

    if (viewerSlot !== roomSnapshot.currentTurnSlot) {
      return 'Wait for your turn';
    }

    setIsSubmittingMove(true);

    try {
      const snapshot = await writeRoomAction({
        action: 'submit-move',
        roomId,
        city
      });

      setRoomSnapshot(snapshot);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to submit city';
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const handleGiveUp = async () => {
    setIsGivingUp(true);

    try {
      const snapshot = await writeRoomAction({ action: 'give-up', roomId });
      setRoomSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'Room is not active') {
        const snapshot = await readRoomSnapshot(roomId).catch(() => null);
        if (snapshot) setRoomSnapshot(snapshot);
      } else {
        toast.error(message || 'Failed to give up');
      }
    } finally {
      setIsGivingUp(false);
    }
  };

  const handlePillClick = (index: number) => {
    const city = roomSnapshot?.chain[index]?.city;
    if (!city) return;

    setFocusCity({ lat: city.lat, lng: city.lng });
    window.setTimeout(() => setFocusCity(null), 2000);
  };

  const handleExit = () => {
    navigate({ to: PATH.play.index });
  };

  const handleRematch = async () => {
    setIsRematching(true);
    try {
      const snapshot = await writeRoomAction({ action: 'rematch', roomId });
      timeoutResolutionVersionRef.current = null;
      timeoutResolutionAttemptedRef.current = null;
      setRoomSnapshot(snapshot);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rematch failed');
    } finally {
      setIsRematching(false);
    }
  };

  const showGuestJoinScreen = !isHost && !hasJoinedRoom;
  const loser = isGameFinished ? (roomSnapshot?.currentTurnSlot ?? null) : null;

  const rematchRequestedBySlot = roomSnapshot?.rematchRequestedBySlot ?? null;
  const iHaveRequestedRematch =
    viewerSlot !== null && rematchRequestedBySlot === viewerSlot;
  const opponentRequestedRematch =
    viewerSlot !== null &&
    rematchRequestedBySlot !== null &&
    rematchRequestedBySlot !== viewerSlot;
  const rematchLabel = iHaveRequestedRematch
    ? 'Waiting for opponent...'
    : opponentRequestedRematch
      ? 'Accept Rematch'
      : 'Rematch';

  return (
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={roomSnapshot?.chain ?? []} focusCity={focusCity} />

      {shouldEnterPresence && localPresenceData ? (
        <PresenceMembership
          channelName={channelName}
          data={localPresenceData}
        />
      ) : null}

      <AnimatePresence>
        {countdown !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`font-mono font-black tabular-nums select-none ${
                  countdown === 0
                    ? 'text-secondary glow-cyan-text text-8xl'
                    : 'text-primary glow-amber-text text-[10rem]'
                }`}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isGameplayVisible ? (
        <>
          <div className="fixed inset-x-0 top-0 z-30">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-4">
              <PlayerCard
                name={players[0]}
                time={derivedTimers[0]}
                isActive={roomSnapshot?.currentTurnSlot === 0 && isGameActive}
                player={0}
              />
              <ChainStrip
                chain={roomSnapshot?.chain ?? []}
                onCityClick={handlePillClick}
              />
              <PlayerCard
                name={players[1]}
                time={derivedTimers[1]}
                isActive={roomSnapshot?.currentTurnSlot === 1 && isGameActive}
                player={1}
              />
            </div>
          </div>

          {isGameActive ? (
            <>
              <CityInput
                requiredLetter={requiredLetter}
                onSubmit={handleSubmitCity}
                currentPlayer={roomSnapshot?.currentTurnSlot ?? 0}
                playerName={players[roomSnapshot?.currentTurnSlot ?? 0]}
                disabled={!showLiveInput}
                disabledPlaceholder={
                  viewerSlot === null
                    ? 'Spectating active room'
                    : `Waiting for ${players[roomSnapshot?.currentTurnSlot ?? 0]}'s move...`
                }
              />

              <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
                <button
                  onClick={handleGiveUp}
                  disabled={
                    isGivingUp || viewerSlot === null || isSubmittingMove
                  }
                  className="border-border/40 bg-card/70 text-muted-foreground hover:border-destructive/60 hover:text-destructive flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition-colors disabled:opacity-50"
                >
                  <Flag size={14} />
                  {isGivingUp ? 'Giving up...' : 'Give Up'}
                </button>
              </div>
            </>
          ) : null}

          {isGameFinished && loser !== null ? (
            <GameOverScreen
              loser={loser}
              players={players}
              chain={roomSnapshot?.chain ?? []}
              gameOverReason={mapGameOverReason(
                roomSnapshot?.gameOverReason ?? null
              )}
              onRematch={handleRematch}
              onExit={handleExit}
              showRematch={!isRematching && viewerSlot !== null}
              rematchLabel={rematchLabel}
              rematchPending={iHaveRequestedRematch}
            />
          ) : null}
        </>
      ) : (
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 pt-24 pb-12">
          {showGuestJoinScreen ? (
            roomSnapshot?.roomStatus === 'active' ||
            roomSnapshot?.roomStatus === 'finished' ? (
              <Card className="bg-card/72 border-border/40 mx-auto w-full max-w-xl backdrop-blur-md">
                <CardHeader>
                  <div className="text-primary mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
                    <Users size={14} />
                    <span>Play a Friend</span>
                  </div>
                  <CardTitle>Room unavailable</CardTitle>
                  <CardDescription>
                    {roomSnapshot.roomStatus === 'active'
                      ? 'This game is already in progress and is not accepting new players.'
                      : 'This game has already ended.'}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleExit}
                  >
                    Back to menu
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="bg-card/72 border-border/40 mx-auto w-full max-w-xl backdrop-blur-md">
                <CardHeader>
                  <div className="text-primary mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
                    <Users size={14} />
                    <span>Play a Friend</span>
                  </div>
                  <CardTitle>Join game</CardTitle>
                  <CardDescription>
                    {hostName} invited you to this private CityChain room.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-3">
                    <ParticipantCard
                      label="Host"
                      participant={hostParticipant}
                      loading={hostParticipantLoading}
                      host
                    />
                  </div>

                  <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                    <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                      Room code
                    </div>
                    <div className="text-foreground font-mono text-sm font-semibold">
                      {roomId}
                    </div>
                  </div>

                  {sessionName ? (
                    <ParticipantCard
                      label="Joining as"
                      participant={{
                        name: sessionName,
                        subtitle: sessionEmail || 'Signed in player',
                        image: sessionImage
                      }}
                    />
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="guest-name"
                        className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase"
                      >
                        Guest name
                      </label>
                      <Input
                        id="guest-name"
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        placeholder="Enter a display name"
                        maxLength={24}
                        className="bg-background/50"
                      />
                    </div>
                  )}

                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <CircleDot
                      size={12}
                      className={
                        connectionState === 'connected'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    />
                    <span>
                      {formatConnectionState(connectionState)} to Ably
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={handleJoin}
                    disabled={isJoiningRoom}
                  >
                    {isJoiningRoom ? 'Joining...' : 'Join game'}
                  </Button>

                  {!sessionName ? (
                    <div className="text-muted-foreground text-xs">
                      Guests are supported. If you sign in first, your account
                      name can be shown in the lobby automatically.
                    </div>
                  ) : null}
                </CardFooter>
              </Card>
            )
          ) : (
            <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.9fr]">
              <Card className="bg-card/72 border-border/40 backdrop-blur-md">
                <CardHeader>
                  <div className="text-primary mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
                    <Users size={14} />
                    <span>Play a Friend</span>
                  </div>
                  <CardTitle>
                    {isHost ? 'Private lobby' : 'Joined lobby'}
                  </CardTitle>
                  <CardDescription>
                    {isHost
                      ? 'Share this link with a friend so they can open the same lobby from another browser or device.'
                      : 'You are connected to the host lobby. Wait here until the match starts.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {isHost ? (
                    <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                      <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                        Invite link
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={shareUrl}
                          readOnly
                          className="bg-background/50 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleCopy}
                          className="min-w-32"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? 'Copied' : 'Copy link'}
                        </Button>
                      </div>
                      <div className="text-muted-foreground mt-3 text-xs">
                        Room code:{' '}
                        <span className="text-foreground font-mono font-semibold">
                          {roomId}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-2 text-xs">
                        Room status:{' '}
                        <span className="text-foreground relative inline-flex pl-5 font-semibold">
                          <span className="pointer-events-none absolute top-1/2 left-0.5 -translate-y-1/2">
                            <hostRoomStatus.icon
                              size={14}
                              className={`${hostRoomStatus.iconClassName} shrink-0`}
                            />
                          </span>
                          <span className="capitalize">
                            {hostRoomStatus.label}
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                      <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                        Room status
                      </div>
                      <div className="text-foreground relative inline-flex pl-5 text-sm font-semibold">
                        <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2">
                          <guestRoomStatus.icon
                            size={14}
                            className={`${guestRoomStatus.iconClassName} shrink-0`}
                          />
                        </span>
                        <span className="capitalize">
                          {guestRoomStatus.label}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-3 text-xs">
                        Room code:{' '}
                        <span className="text-foreground font-mono font-semibold">
                          {roomId}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3">
                    <ParticipantCard
                      label="Host"
                      participant={hostParticipant}
                      loading={hostParticipantLoading}
                      host
                    />
                    <ParticipantCard
                      label="Friend"
                      participant={guestParticipant}
                      loading={guestParticipantLoading}
                      empty={!guestParticipant}
                    />
                  </div>

                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <CircleDot
                      size={12}
                      className={
                        connectionState === 'connected'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    />
                    <span>
                      {formatConnectionState(connectionState)} to Ably
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Persisted players in room: {1 + persistedGuestCount}/2
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-muted-foreground text-xs">
                    Lobby presence is live through Ably, and room
                    membership/status now persists in the multiplayer tables.
                  </div>
                  {isHost ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled={
                        !hasGuestInLobby ||
                        connectionState !== 'connected' ||
                        isStartingRoom ||
                        isBootstrappingRoom
                      }
                      onClick={handleStart}
                    >
                      <Users size={16} />
                      {isStartingRoom ? 'Starting...' : 'Start game'}
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>

              <Card className="bg-card/72 border-border/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle>{isHost ? 'Host view' : 'Guest view'}</CardTitle>
                  <CardDescription>
                    {isHost
                      ? 'Open the copied link in a private browser to preview the guest join flow.'
                      : 'You are now inside the room and waiting on the host.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isHost ? (
                    <>
                      <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                        <div className="text-foreground mb-2 text-sm font-semibold">
                          {hasGuestInLobby
                            ? 'Your friend is in the lobby'
                            : 'Waiting for a friend to join'}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {hasGuestInLobby && guestParticipant
                            ? `${guestParticipant.name} joined this room and the room is now persisted as ready.`
                            : 'Share the invite link and wait for your friend to click Join game from another browser or device.'}
                        </p>
                      </div>

                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        <Link to={PATH.play.index}>Back to game modes</Link>
                      </Button>
                    </>
                  ) : hasJoinedRoom ? (
                    <div className="space-y-4">
                      <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                        <div className="text-foreground mb-2 text-sm font-semibold">
                          You joined the lobby
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {liveHostParticipant
                            ? 'Your presence is live through Ably and your join is now stored in the multiplayer room records.'
                            : 'You are connected. If the host opens this room, they will appear here live too.'}
                        </p>
                      </div>

                      {!sessionName ? (
                        <Button
                          asChild
                          variant="outline"
                          size="lg"
                          className="w-full"
                        >
                          <Link to={PATH.signIn}>Sign in instead</Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
