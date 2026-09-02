import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Brain, ChevronLeft, ChevronRight, CircleUserRound, Feather, Heart, Home, LockKeyhole, Menu, MoreHorizontal, Settings, Sparkles, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Companion', icon: Home },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/insights', label: 'Insights', icon: Brain },
];
const secondaryItems = [
  { href: '/memory', label: 'Memory', icon: LockKeyhole },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="flex items-center gap-2.5" data-testid="link-logo">
    <span className="grid size-9 shrink-0 place-items-center rounded-[13px] bg-accent text-foreground shadow-sm">
      <Feather size={18} strokeWidth={2.3} />
    </span>
    {!compact && <span className="font-display text-[25px] leading-none tracking-[-.04em] text-sidebar-foreground">unsaid</span>}
  </Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  const nav = (item: typeof navItems[number]) => {
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${active(item.href) ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${item.label.toLowerCase()}`}>
      <Icon size={17} strokeWidth={active(item.href) ? 2.3 : 1.8} /><span>{item.label}</span>{active(item.href) && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
    </Link>;
  };
  return <div className="min-h-[100dvh] bg-background text-foreground">
    <button className={`fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[2px] transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu" />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-10 flex items-center justify-between px-2"><Logo /><button className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={18} /></button></div>
      <div className="mb-3 px-3 font-mono-ui text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/35">Your space</div>
      <nav className="space-y-1">{navItems.map(nav)}</nav>
      <div className="mb-3 mt-9 px-3 font-mono-ui text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/35">Keep private</div>
      <nav className="space-y-1">{secondaryItems.map(nav)}</nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
        <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sidebar-primary"><Heart size={15} fill="currentColor" /></div>
        <p className="text-[12px] font-semibold leading-5">A place for what has not found words yet.</p>
        <p className="mt-1 text-[11px] leading-4 text-sidebar-foreground/45">Your conversations stay yours.</p>
      </div>
      <Link href="/settings" onClick={() => setMobileOpen(false)} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="link-profile-settings">
        <span className="grid size-7 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent"><CircleUserRound size={15} /></span><span className="flex-1">Your account</span><ChevronRight size={14} />
      </Link>
    </aside>
    <div className="md:pl-[248px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-xl md:px-9">
        <button className="rounded-xl p-2 hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-menu"><Menu size={20} /></button>
        <div className="hidden items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground md:flex"><span className="size-1.5 rounded-full bg-primary animate-pulse-soft" />Private by default</div>
        <div className="ml-auto flex items-center gap-2 text-muted-foreground"><button className="rounded-xl p-2 hover:bg-muted" aria-label="More options" data-testid="button-more-options"><MoreHorizontal size={19} /></button><span className="hidden text-xs sm:inline">Take your time.</span></div>
      </header>
      <main className="mx-auto max-w-[1320px] px-5 py-7 md:px-9 md:py-10">{children}</main>
    </div>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</div><h1 className="font-display text-4xl tracking-[-.045em] text-foreground md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}
  </div>;
}

export function LoadingBlocks({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Loading" data-testid="status-loading">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/80" />)}</div>;
}

export function ErrorNotice({ message = 'This space is taking a little longer to open.' }: { message?: string }) {
  return <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm text-foreground" data-testid="status-error"><p className="font-semibold">A quiet pause.</p><p className="mt-1 text-muted-foreground">{message}</p></div>;
}

export function EmptyState({ icon: Icon = Feather, title, description, action }: { icon?: typeof Feather; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-card/50 p-8 text-center" data-testid="status-empty"><span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon size={20} /></span><h3 className="font-display text-xl">{title}</h3><p className="mt-2 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Button({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${variant === 'primary' ? 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md' : variant === 'outline' ? 'border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted' : variant === 'danger' ? 'bg-destructive/10 text-destructive hover:bg-destructive/15' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${props.className ?? ''}`} />;
}

export function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (value: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={enabled} aria-label={label} onClick={() => onChange(!enabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted-foreground/25'}`} data-testid={`toggle-${label?.toLowerCase().replaceAll(' ', '-') ?? 'setting'}`}><span className={`absolute top-1 size-4 rounded-full bg-card shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>;
}

export function formatDate(value: string, withYear = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) }).format(date);
}
