import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useState, useEffect, type ChangeEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  History,
  Pencil,
  Shield,
  Swords,
  Trash2,
  User
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { PATH } from '@/constants/path';
import { getModeLabel } from '@/constants/gameMode';
import type { GameMode } from '@/constants/gameMode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session?.user) throw redirect({ to: PATH.signIn });
  },
  component: ProfilePage
});

type Stats = {
  total: number;
  wins: number;
  winRate: number;
  longestChain: number;
  favouriteMode: GameMode | null;
};

function StatCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,.14)'
      }}
    >
      <div
        className="flex size-9 items-center justify-center rounded-xl"
        style={{
          background: 'color-mix(in oklab, var(--primary) 12%, transparent)'
        }}
      >
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
      </div>
      <div>
        <p className="text-foreground text-2xl font-bold tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,.14)'
      }}
    >
      <div
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ChangeNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName) return;
    setLoading(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? 'Failed to update name');
    } else {
      toast.success('Display name updated');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
          maxLength={50}
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !name.trim() || name === currentName}
      >
        {loading ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}

function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();
    if (!email.trim() || email === currentEmail) return;
    setLoading(true);
    const { error } = await authClient.changeEmail({
      newEmail: email.trim(),
      callbackURL: PATH.profile
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? 'Failed to update email');
    } else {
      toast.success('Verification email sent to your new address');
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Current email:{' '}
        <span className="text-foreground font-medium">{currentEmail}</span>
      </p>
      <p className="text-muted-foreground text-xs">
        A verification link will be sent to your new address. Your account will be marked unverified until confirmed.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="new-email">New email</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !email.trim() || email === currentEmail}
        >
          {loading ? 'Sending…' : 'Update email'}
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();
    if (!current || !next) return;
    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: false
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? 'Failed to change password');
    } else {
      toast.success('Password changed');
      setCurrent('');
      setNext('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <div>
        <Button type="submit" disabled={loading || !current || !next}>
          {loading ? 'Changing…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}

function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await authClient.deleteUser();
    setLoading(false);
    if (error) {
      toast.error(error.message ?? 'Failed to delete account');
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          Permanently delete your account and all game history. This cannot be
          undone.
        </p>
        <div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{
        background: 'color-mix(in oklab, var(--destructive) 8%, transparent)',
        borderColor: 'color-mix(in oklab, var(--destructive) 25%, transparent)'
      }}
    >
      <p className="text-foreground text-sm font-medium">
        Are you sure? This will permanently delete your account and all
        associated data.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? 'Deleting…' : 'Yes, delete my account'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .finally(() => setStatsLoading(false));
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="mx-auto px-6 py-10 pt-20">
      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="bg-primary/10 ring-primary/20 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
          <User size={18} className="text-primary" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your account and stats
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Player card */}
        <div
          className="flex items-center gap-5 rounded-2xl border p-6"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,.14)'
          }}
        >
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold"
            style={{
              background:
                'radial-gradient(120% 120% at 30% 25%, color-mix(in oklab, var(--primary) 100%, white 15%), var(--primary) 70%)',
              color: 'var(--primary-foreground)',
              boxShadow:
                '0 0 0 1px color-mix(in oklab, var(--primary) 50%, transparent), 0 8px 22px -8px color-mix(in oklab, var(--primary) 60%, transparent)'
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-foreground text-lg font-bold">{user.name}</p>
              {user.emailVerified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background:
                      'color-mix(in oklab, var(--primary) 14%, transparent)',
                    color: 'var(--primary)',
                    boxShadow:
                      'inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent)'
                  }}
                >
                  <BadgeCheck className="h-3 w-3" />
                  Email verified
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Member since {memberSince}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0 gap-1.5"
          >
            <Link to={PATH.history}>
              <History className="h-4 w-4" />
              History
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div>
          <h2
            className="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Stats
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Games played"
                value={stats?.total ?? 0}
                icon={<Swords size={18} />}
              />
              <StatCard
                label="Win rate"
                value={`${stats?.winRate ?? 0}%`}
                icon={<Shield size={18} />}
              />
              <StatCard
                label="Longest chain"
                value={stats?.longestChain ?? 0}
                icon={<Building2 size={18} />}
              />
              <StatCard
                label="Favourite mode"
                value={
                  stats?.favouriteMode ? getModeLabel(stats.favouriteMode) : '—'
                }
                icon={<Swords size={18} />}
              />
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Settings
          </h2>
          <div className="flex flex-col gap-4">
            <SectionCard title="Display name" icon={<Pencil size={16} />}>
              <ChangeNameForm currentName={user.name} />
            </SectionCard>

            <SectionCard title="Email address" icon={<BadgeCheck size={16} />}>
              <ChangeEmailForm currentEmail={user.email} />
            </SectionCard>

            <SectionCard title="Password" icon={<Shield size={16} />}>
              <ChangePasswordForm />
            </SectionCard>

            <SectionCard title="Danger zone" icon={<Trash2 size={16} />}>
              <DeleteAccountSection />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
