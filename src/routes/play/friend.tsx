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
  CircleDot,
  Copy,
  Crown,
  Loader2,
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
import GameModeSelector from '@/components/game/GameModeSelector';
import PlayerCard from '@/components/game/PlayerCard';
import WorldMap from '@/components/game/WorldMap';
import { useGameStatus } from '@/context/gameStatus';
import { authClient } from '@/lib/auth-client';
import { useScrollLock } from '@/hooks/useScrollLock';
import { getInitialFriendRoomSnapshot } from '@/server/friend-room';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PATH } from '#/constants/path';
import { type CityData } from '@/types/city';
import { type GameMode, DEFAULT_GAME_MODE } from '@/constants/gameMode';
import {
  type Participant,
  type LobbyPresenceData,
  type RoomSnapshot
} from '@/types/room';
import {
  makeRoomId,
  getInitials,
  getParticipantFromPresence,
  getParticipantFromSnapshot,
  formatConnectionState,
  getRequiredLetter,
  getCountdownValue,
  getDerivedTimers,
  getPlayers,
  mapGameOverReason
} from '@/utils/room';

type FriendSearch = {
  room?: string;
  host?: '1';
  hostName?: string;
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
    | { action: 'start'; roomId: string; gameMode?: GameMode }
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
  const [selectedMode, setSelectedMode] = useState<GameMode>(DEFAULT_GAME_MODE);
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
        .then((snapshot) =>
          setRoomSnapshot((prev) => {
            if (prev?.viewer && !snapshot.viewer) {
              return { ...snapshot, viewer: prev.viewer };
            }
            return snapshot;
          })
        )
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
          setRoomSnapshot((prev) => {
            if (prev?.viewer && !snapshot.viewer) {
              return { ...snapshot, viewer: prev.viewer };
            }
            return snapshot;
          });
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
          setRoomSnapshot((prev) => {
            // Don't let a stale request (e.g. fired before the join cookie was
            // set) strip away a viewer that's already been established.
            if (prev?.viewer && !snapshot.viewer) {
              return { ...snapshot, viewer: prev.viewer };
            }
            return snapshot;
          });
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
      derivedTimers[roomSnapshot.currentTurnSlot] < 0 ||
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
        roomId,
        gameMode: selectedMode
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

  const showGuestJoinScreen = !isHost && !hasJoinedRoom;
  const loser = isGameFinished ? (roomSnapshot?.loserSlot ?? null) : null;

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

  const handleRematch = async () => {
    if (isRematching || iHaveRequestedRematch) return;
    setIsRematching(true);
    try {
      const snapshot = await writeRoomAction({ action: 'rematch', roomId });
      timeoutResolutionVersionRef.current = null;
      timeoutResolutionAttemptedRef.current = null;
      setRoomSnapshot((prev) => {
        if (prev?.viewer && !snapshot.viewer) {
          return { ...snapshot, viewer: prev.viewer };
        }
        return snapshot;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rematch failed');
    } finally {
      setIsRematching(false);
    }
  };

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
                disabled={!showLiveInput}
                disabledPlaceholder={
                  viewerSlot === null
                    ? 'Spectating active room'
                    : `Waiting for ${players[roomSnapshot?.currentTurnSlot ?? 0]}'s move...`
                }
                onQuit={viewerSlot !== null ? handleGiveUp : undefined}
                quitLabel={isGivingUp ? 'Giving up...' : 'Give Up'}
                quitDisabled={isGivingUp || isSubmittingMove}
              />
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
              <Card className="bg-card/72 border-border/40 mx-auto w-full max-w-xl py-0 backdrop-blur-md">
                <CardHeader className="px-8 pt-8 pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 ring-primary/20 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
                        <Users
                          size={18}
                          className="text-primary"
                          strokeWidth={2.2}
                        />
                      </div>
                      <div>
                        <CardTitle>Room unavailable</CardTitle>
                        <CardDescription className="mt-1">
                          {roomSnapshot.roomStatus === 'active'
                            ? 'This game is already in progress and is not accepting new players.'
                            : 'This game has already ended.'}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={handleExit}
                  >
                    Back to menu
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/72 border-border/40 mx-auto w-full max-w-xl py-0 backdrop-blur-md">
                <CardHeader className="px-8 pt-8 pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 ring-primary/20 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
                        <Users
                          size={18}
                          className="text-primary"
                          strokeWidth={2.2}
                        />
                      </div>
                      <div>
                        <CardTitle>Join game</CardTitle>
                        <CardDescription className="mt-1">
                          {hostName} invited you to this private CityChain room.
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CircleDot
                          size={10}
                          className={
                            connectionState === 'connected'
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }
                        />
                        <span>{formatConnectionState(connectionState)}</span>
                      </div>
                      <span className="font-mono">{roomId}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-6 px-8 pb-8">
                  <ParticipantCard
                    label="Host"
                    participant={hostParticipant}
                    loading={hostParticipantLoading}
                    host
                  />

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
                    <div className="grid gap-2">
                      <Label htmlFor="guest-name">Guest name</Label>
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
                    <p className="text-muted-foreground text-xs">
                      Guests are supported. If you sign in first, your account
                      name can be shown in the lobby automatically.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="bg-card/72 border-border/40 mx-auto w-full max-w-xl py-0 backdrop-blur-md">
              <CardHeader className="px-8 pt-8 pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 ring-primary/20 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
                      <Users
                        size={18}
                        className="text-primary"
                        strokeWidth={2.2}
                      />
                    </div>
                    <div>
                      <CardTitle>
                        {isHost ? 'Private Lobby' : 'Joined Lobby'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {isHost
                          ? 'Waiting for your friend to join.'
                          : 'Connected. Waiting for the host to start.'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CircleDot
                        size={10}
                        className={
                          connectionState === 'connected'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }
                      />
                      <span>{formatConnectionState(connectionState)}</span>
                    </div>
                    <span className="font-mono">{roomId}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-6 px-8 pb-8">
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

                {isHost && (
                  <div className="grid gap-2">
                    <Label>Invite link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="bg-background/50 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        className="shrink-0"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Share this link with a friend to invite them to this room.
                    </p>
                  </div>
                )}

                {isHost && (
                  <div className="grid gap-3">
                    <Label>Time per turn</Label>
                    <GameModeSelector
                      value={selectedMode}
                      onChange={setSelectedMode}
                    />
                  </div>
                )}

                {!sessionName && hasJoinedRoom && !isHost && (
                  <p className="text-muted-foreground text-xs">
                    Guests are supported. Sign in first to have your account
                    name shown automatically.
                  </p>
                )}

                <div className="mt-2 grid gap-3">
                  {isHost ? (
                    <>
                      <Button
                        type="button"
                        size="lg"
                        className="w-full"
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
                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        <Link to={PATH.play.index}>Back to game modes</Link>
                      </Button>
                    </>
                  ) : hasJoinedRoom && !sessionName ? (
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
