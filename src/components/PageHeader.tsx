import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ea-600 to-aqua-500 text-white shadow-md shadow-ea-600/20">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ea-950 md:text-[28px]">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon?: LucideIcon; title: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="ea-empty">
      {Icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-full bg-ea-50 text-ea-600">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="font-semibold text-ea-950">{title}</div>
      {hint ? <div className="max-w-sm text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
