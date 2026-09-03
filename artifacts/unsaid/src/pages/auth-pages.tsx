import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Feather, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth-provider';

type AuthMode = 'login' | 'signup';

function AuthFrame({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-primary px-5 py-10 text-foreground">
    <div className="w-full max-w-[430px] animate-rise">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 text-primary-foreground" data-testid="link-auth-logo">
        <span className="grid size-10 place-items-center rounded-[14px] bg-accent text-foreground shadow-sm"><Feather size={19} strokeWidth={2.3} /></span>
        <span className="font-display text-[28px] tracking-[-.04em]">unsaid</span>
      </Link>
      <section className="rounded-[28px] border border-border bg-card p-6 quiet-shadow sm:p-8">{children}</section>
      <p className="mt-5 text-center text-xs text-primary-foreground/60">A private place for what has not found words yet.</p>
    </div>
  </main>;
}

function AuthLoading() {
  return <AuthFrame><div className="grid min-h-[250px] place-items-center text-sm text-muted-foreground">Opening your private space…</div></AuthFrame>;
}

function AuthPage({ mode }: { mode: AuthMode }) {
  const { loading, session, signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isSignup = mode === 'signup';

  useEffect(() => {
    if (session) setLocation('/chat');
  }, [session, setLocation]);

  if (loading || session) return <AuthLoading />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    const result = isSignup ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.session) {
      setLocation('/chat');
    } else {
      setNotice('Check your email to confirm your account, then come back to sign in.');
    }
  };

  return <AuthFrame>
    <div className="mb-8">
      <div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{isSignup ? 'A first step' : 'Welcome back'}</div>
      <h1 className="font-display text-4xl tracking-[-.045em]">{isSignup ? 'Make a little room.' : 'Come back to yourself.'}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{isSignup ? 'Create a private account for your conversations and reflections.' : 'Sign in to continue your quiet conversation.'}</p>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-2 block text-xs font-bold">Email address</span><span className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 focus-within:border-primary/60"><Mail size={16} className="shrink-0 text-muted-foreground" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60" data-testid="input-auth-email" /></span></label>
      <label className="block"><span className="mb-2 block text-xs font-bold">Password</span><span className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 focus-within:border-primary/60"><LockKeyhole size={16} className="shrink-0 text-muted-foreground" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={6} placeholder="At least 6 characters" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60" data-testid="input-auth-password" /></span></label>
      {error && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive" role="alert" data-testid="status-auth-error">{error}</p>}
      {notice && <p className="rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm leading-5 text-primary" role="status" data-testid="status-auth-notice">{notice}</p>}
      <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-auth-submit">{submitting ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}{!submitting && <ArrowRight size={16} />}</button>
    </form>
    <p className="mt-6 text-center text-sm text-muted-foreground">{isSignup ? 'Already have an account?' : 'New to Unsaid?'} <Link href={isSignup ? '/login' : '/signup'} className="font-bold text-primary underline-offset-4 hover:underline" data-testid="link-auth-switch">{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
  </AuthFrame>;
}

export function LoginPage() {
  return <AuthPage mode="login" />;
}

export function SignupPage() {
  return <AuthPage mode="signup" />;
}