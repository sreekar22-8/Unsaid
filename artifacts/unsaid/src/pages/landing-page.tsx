import { Link } from 'wouter';
import { Feather, ArrowRight, Mic, Brain, RefreshCw, Lightbulb } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const MODES = [
  {
    icon: Mic,
    name: 'Listen',
    description: "Be heard without advice or judgment - just pure space to say what's hard.",
  },
  {
    icon: Brain,
    name: 'Understand',
    description: "Untangle mixed feelings and put names to what you can't quite articulate yet.",
  },
  {
    icon: RefreshCw,
    name: 'Reframe',
    description: 'Gently explore a regret or difficult thought from a kinder, more compassionate angle.',
  },
  {
    icon: Lightbulb,
    name: 'Help',
    description: 'Receive two or three small, realistic, and manageable next steps when you feel ready.',
  },
] as const;

export function LandingPage() {
  const { session } = useAuth();

  const getStartedHref = session ? '/chat' : '/signup';
  const getStartedLabel = session ? 'Open Chat' : 'Get Started';

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
        <Link href="/" className="flex items-center gap-2.5" aria-label="Unsaid homepage" data-testid="link-landing-logo">
          <span className="grid size-9 place-items-center rounded-[12px] bg-accent text-foreground shadow-sm">
            <Feather size={17} strokeWidth={2.3} />
          </span>
          <span className="font-display text-[26px] tracking-[-.04em] text-foreground">
            unsaid
          </span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Sign in or create account">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-2xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                data-testid="link-landing-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/chat"
                className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md"
                data-testid="link-landing-signup"
              >
                Open Chat <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
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
          className="font-display text-[clamp(2.3rem,6vw,4.2rem)] leading-[1.1] tracking-[-.04em] text-foreground"
        >
          A calm, private space for what you{' '}
          <em className="not-italic text-accent">haven't</em> said out loud.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Unsaid is a calm, judgment-free AI companion for navigating tangled emotions, reflecting in private, and finding quiet clarity on your own terms.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={getStartedHref}
            className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            data-testid="link-landing-cta-primary"
          >
            {getStartedLabel} <ArrowRight size={15} />
          </Link>
          {!session && (
            <Link
              href="/login"
              className="rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              data-testid="link-landing-cta-secondary"
            >
              Sign in
            </Link>
          )}
        </div>

        <div
          className="mt-8 max-w-lg text-center text-xs leading-5 text-muted-foreground/80"
          data-testid="mental-health-disclaimer"
        >
          <p>
            <span className="font-semibold text-foreground/80">Please note:</span> Unsaid is a supportive reflection companion and is not a replacement for professional mental health support, diagnosis, or therapy. If you are experiencing a crisis, please reach out to local emergency services or a qualified mental health professional.
          </p>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 sm:px-10"
        aria-label="Conversation modes"
      >
        <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[.22em] text-muted-foreground">
          Four ways to be met
        </p>

        <p className="mb-8 text-center text-sm leading-6 text-muted-foreground sm:text-base" data-testid="modes-summary-line">
          Choose how you want to be met: <strong className="font-semibold text-foreground">Listen</strong> without advice, <strong className="font-semibold text-foreground">Understand</strong> tangled feelings, <strong className="font-semibold text-foreground">Reframe</strong> from a kinder angle, or <strong className="font-semibold text-foreground">Help</strong> with small next steps.
        </p>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {MODES.map(({ icon: Icon, name, description }) => (
            <li
              key={name}
              className="group flex flex-col gap-3 rounded-[20px] border border-border bg-card px-5 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              data-testid={`card-mode-${name.toLowerCase()}`}
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

      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        <p>&copy; Unsaid. A private space for what hasn't found words yet.</p>
      </footer>
    </main>
  );
}
