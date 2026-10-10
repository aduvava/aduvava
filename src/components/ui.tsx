import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-lifted backdrop-blur", className)} {...props} />;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-moss", className)}>{children}</span>;
}

export function ButtonLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={clsx("inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-moss", className)}>
      {children}
    </Link>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2 className="mt-4 font-display text-3xl font-black leading-tight text-ink md:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-ink/70 md:text-lg">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="text-center">
      <h3 className="font-display text-2xl font-black text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink/65">{description}</p>
    </Card>
  );
}
