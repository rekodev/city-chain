import { useRouter } from '@tanstack/react-router';
import { PowerIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { PATH } from '#/constants/path';

type Props = {
  name: string;
  email: string;
  image?: string | null;
};

export default function UserMenu({ name, email, image }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.navigate({ to: PATH.signIn });
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground font-normal">
          Logged in as{' '}
          <span className="text-foreground font-medium">{email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="cursor-pointer gap-2"
        >
          <PowerIcon className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
