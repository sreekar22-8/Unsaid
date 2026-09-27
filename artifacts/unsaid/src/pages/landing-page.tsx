import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Feather, ArrowRight, Mic, Brain, RefreshCw, Lightbulb } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const MODES = [
  {
    icon: Mic,
    name: 'Listen',
    description: "Be heard without advice or judgment — just space to say what's hard.",
  },
  {
    icon: Brain,
    name: 'Understand',
    description: "Name the mixed feelings you can't quite put into words yet.",
  },
  {
    icon: RefreshCw,
    name: 'Reframe',
    description: 'Gently revisit a regret or mistake from a kinder angle.',
  },
  {
    icon: Lightbulb,
    name: 'Help',
    description: 'Get two or three small, realistic next steps when you are ready.',
  },
] as const;

export function LandingPage() {
  const { loading, session } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && session) setLocation('/chat');
  }, [loading, session, setLocation]);

  if (loading || session) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background text-sm text-muted-foreground">
        Opening your private space...
      </div>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 60% -10%, hsl(174 38% 31% / 0.08) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 50% 40% at 10% 90%, hsl(15 76% 68% / 0.07) 0%, transparent 60%)',
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5" aria-label="Unsaid">
          <span className="grid size-9 place-items-center rounded-[12px] bg-accent text-foreground shadow-sm">
            <Feather size={17} strokeWidth={2.3} />
          </span>
          <span className="font-display text-[26px] tracking-[-.04em] text-foreground">
            unsaid
          </span>
        </div>

        <nav className="flex items-center gap-2" aria-label="Sign in or create account">
          <Link
            href="/login"
            className="rounded-2xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            data-testid="link-landing-login"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md"
            data-testid="link-landing-signup"
          >
            Get Started <ArrowRight size={14} />
          </Link>
        </nav>
      </header>

      <section
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-10 pt-16 text-center sm:px-10 sm:pt-20"
        aria-labelledby="hero-heading"
      >
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[.22em] text-primary/80">
          A private space to process
        </p>

        <h1
          id="hero-heading"
          className="font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.08] tracking-[-.045em] text-foreground"
        >
          The things you{' '}
          <em className="not-italic text-accent">haven't</em>
          <br />
          found words for yet.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Unsaid is a calm, judgment-free companion for the emotions that live just
          below the surface. Choose how you want to be met and say what you
          haven't said.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            data-testid="link-landing-cta-primary"
          >
            Get Started <ArrowRight size={15} />
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
            data-testid="link-landing-cta-secondary"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-8 max-w-md text-xs leading-5 text-muted-foreground/70">
          Unsaid is not a replacement for professional mental health support. If you are
          in crisis, please reach out to a qualified therapist or a crisis line in your area.
        </p>
      </section>

      <section
        className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 sm:px-10"
        aria-label="Conversation modes"
      >
        <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[.22em] text-muted-foreground">
          Four ways to be met
        </p>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {MODES.map(({ icon: Icon, name, description }) => (
            <li
              key={name}
              className="group flex flex-col gap-3 rounded-[20px] border border-border bg-card px-5 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
            >
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-secondary text-primary transition-colors group-hover:bg-primary/10">
                <Icon size={16} strokeWidth={2} />
              </span>
              <div>
                <p className="mb-1 text-sm font-bold text-foreground">{name}</p>
                <p className="text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
