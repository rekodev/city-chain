import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ChannelProvider,
  useAbly,
  useConnectionStateListener,
  usePresence,
  usePresenceListener
} from 'ably/react';
import {
  Check,
  CheckCircle2,
  Copy,
  CircleDot,
  Crown,
  Flag,
  Loader2,
  PlayCircle,
  Timer,
  TriangleAlert,
  UserRound,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import WorldMap from '@/components/game/WorldMap';
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
  component: PlayFriendLobby
});

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
    slot: number;
    displayName: string;
    isGuest: boolean;
    isReady: boolean;
    userId: string | null;
  }>;
};

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
    )
      continue;

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
  slot: number,
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

function PlayFriendLobby() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session, isPending: authIsPending } = authClient.useSession();

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
  authIsPending
}: {
  roomId: string;
  isHost: boolean;
  hostName: string;
  sessionName: string;
  sessionEmail: string;
  sessionImage?: string | null;
  authIsPending: boolean;
}) {
  const ably = useAbly();
  const [guestName, setGuestName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionState, setConnectionState] = useState(ably.connection.state);
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(null);
  const [isBootstrappingRoom, setIsBootstrappingRoom] = useState(isHost);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isStartingRoom, setIsStartingRoom] = useState(false);
  const channelName = `multiplayer-room:${roomId}`;
  const { presenceData } = usePresenceListener(channelName);

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
  const shouldEnterPresence = isHost || hasJoined;
  const persistedGuestCount =
    roomSnapshot?.participants.filter((participant) => participant.slot === 1)
      .length ?? 0;
  const hasGuestInLobby =
    Boolean(liveGuestParticipant) || persistedGuestCount > 0;
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
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapRoom = async () => {
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
  }, [hostName, isHost, roomId, sessionName]);

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

    const handleRoomJoined = (message: { data?: unknown }) => {
      const payload = message.data;
      if (!payload || typeof payload !== 'object') return;

      const joinedRoomId = (payload as { roomId?: string }).roomId;
      if (joinedRoomId !== roomId) return;

      refreshSnapshot();
    };

    const handleGameStarted = (message: { data?: unknown }) => {
      const payload = message.data;
      if (!payload || typeof payload !== 'object') return;

      const startedRoomId = (payload as { roomId?: string }).roomId;
      if (startedRoomId !== roomId) return;

      refreshSnapshot();
      toast.success('Game started');
    };

    channel.subscribe('room.joined', handleRoomJoined);
    channel.subscribe('game.started', handleGameStarted);

    return () => {
      channel.unsubscribe('room.joined', handleRoomJoined);
      channel.unsubscribe('game.started', handleGameStarted);
    };
  }, [ably, channelName, roomId]);

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

  const showGuestJoinScreen = !isHost && !hasJoined;

  return (
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={[]} />
      {shouldEnterPresence && localPresenceData ? (
        <PresenceMembership
          channelName={channelName}
          data={localPresenceData}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 pt-24 pb-12">
        {showGuestJoinScreen ? (
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
                <span>{formatConnectionState(connectionState)} to Ably</span>
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
                  Guests are supported. If you sign in first, your account name
                  can be shown in the lobby automatically.
                </div>
              ) : null}
            </CardFooter>
          </Card>
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
                  <span>{formatConnectionState(connectionState)} to Ably</span>
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
                ) : hasJoined ? (
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
    </div>
  );
}
