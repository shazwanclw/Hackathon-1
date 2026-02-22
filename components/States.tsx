export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return <div className="card p-6 text-sm text-muted">{text}</div>;
}

export function EmptyState({ text = 'No results yet.' }: { text?: string }) {
  return <div className="card p-6 text-sm text-muted">{text}</div>;
}

export function ErrorState({ text = 'Something went wrong.' }: { text?: string }) {
  return <div className="card border-rose-300/70 bg-rose-100/70 p-6 text-sm text-rose-900">{text}</div>;
}