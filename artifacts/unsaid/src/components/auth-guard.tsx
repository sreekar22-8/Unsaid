import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/components/auth-provider';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !session) setLocation('/login');
  }, [loading, session, setLocation]);

  if (loading || !session) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm text-muted-foreground">Opening your private space…</div>;
  }

  return <>{children}</>;
}