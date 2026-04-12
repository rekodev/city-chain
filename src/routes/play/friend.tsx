import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
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
  empty = false,
  host = false
}: {
  label: string;
  participant?: Participant;
  empty?: boolean;
  host?: boolean;
}) {
  return (
    <div className="border-border/40 bg-card/65 flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm">
      {participant ? (
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
      </div>
    </div>
  );
}

function PlayFriendLobby() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: session } = authClient.useSession();
  const [guestName, setGuestName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const sessionName = session?.user?.name?.trim() || '';
  const sessionEmail = session?.user?.email?.trim() || '';
  const isHost = search.host === '1';
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

  const hostName = search.hostName || sessionName || 'Host';

  const hostParticipant = useMemo<Participant>(
    () => ({
      name: isHost ? sessionName || 'You' : hostName,
      subtitle: isHost
        ? sessionEmail || 'Hosting this lobby'
        : 'Host is preparing the lobby',
      image: isHost ? session?.user?.image : undefined
    }),
    [hostName, isHost, session?.user?.image, sessionEmail, sessionName]
  );

  const guestParticipant = useMemo<Participant | undefined>(() => {
    if (isHost || !hasJoined) return undefined;

    if (sessionName) {
      return {
        name: sessionName,
        subtitle: sessionEmail || 'Signed in player',
        image: session?.user?.image
      };
    }

    return {
      name: guestName.trim(),
      subtitle: 'Guest player',
      image: undefined
    };
  }, [
    guestName,
    hasJoined,
    isHost,
    session?.user?.image,
    sessionEmail,
    sessionName
  ]);

  const shareUrl = useMemo(() => {
    if (!roomId || typeof window === 'undefined') return '';

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

  const handleCopy = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Invite link copied');
  };

  const handleJoin = () => {
    if (!sessionName && guestName.trim().length < 2) {
      toast.error('Enter a guest name to join this lobby');
      return;
    }

    setHasJoined(true);
    toast.success(
      sessionName ? 'Joined lobby as signed-in player' : 'Joined lobby as guest'
    );
  };

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
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={[]} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 pt-24 pb-12">
        <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.9fr]">
          <Card className="bg-card/72 border-border/40 backdrop-blur-md">
            <CardHeader>
              <div className="text-primary mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
                <Link2 size={14} />
                <span>Play a Friend</span>
              </div>
              <CardTitle>Private lobby</CardTitle>
              <CardDescription>
                Share this link with a friend so they can open the same lobby
                from another browser or device.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
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
              </div>

              <div className="grid gap-3">
                <ParticipantCard
                  label="Host"
                  participant={hostParticipant}
                  host
                />
                <ParticipantCard
                  label="Friend"
                  participant={guestParticipant}
                  empty={!guestParticipant}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-xs">
                Step 1 ships the shareable lobby and join UI. Live cross-device
                presence and starting the actual match come in step 2.
              </div>
              {isHost ? (
                <Button type="button" size="lg" disabled>
                  <Users size={16} />
                  Start game
                </Button>
              ) : null}
            </CardFooter>
          </Card>

          <Card className="bg-card/72 border-border/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle>{isHost ? 'Host view' : 'Join this lobby'}</CardTitle>
              <CardDescription>
                {isHost
                  ? 'Open the copied link in a private browser to preview the guest join flow.'
                  : 'This screen is what your friend sees when they open the invite link.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {isHost ? (
                <>
                  <div className="border-border/40 bg-background/45 rounded-xl border p-4">
                    <div className="text-foreground mb-2 text-sm font-semibold">
                      Waiting for a friend to join
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Realtime lobby presence is the next step, so this host
                      screen stays in waiting mode for now.
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
                      Your local join state is working. In step 2, the host will
                      see you appear live and will be able to start the match
                      for both devices.
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
              ) : (
                <div className="space-y-4">
                  {sessionName ? (
                    <ParticipantCard
                      label="Joining as"
                      participant={{
                        name: sessionName,
                        subtitle: sessionEmail || 'Signed in player',
                        image: session?.user?.image
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

                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={handleJoin}
                  >
                    Join lobby
                  </Button>

                  {!sessionName ? (
                    <div className="text-muted-foreground text-xs">
                      Guests are supported. If you sign in first, your account
                      name can be shown in the lobby automatically.
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
