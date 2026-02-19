export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return <div className="card p-6 text-sm text-slate-600">{text}</div>;
}

export function EmptyState({ text = 'No results yet.' }: { text?: string }) {
  return <div className="card p-6 text-sm text-slate-600">{text}</div>;
}

export function ErrorState({ text = 'Something went wrong.' }: { text?: string }) {
  return <div className="card border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{text}</div>;
}
