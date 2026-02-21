import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="grid gap-6 py-8 md:grid-cols-2 md:items-center">
      <div>
        <p className="mb-2 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900">SDG 11 Aligned</p>
        <h1 className="text-4xl font-extrabold leading-tight text-slate-900">Report stray animals quickly. Help responders act faster.</h1>
        <p className="mt-4 text-slate-600">
          StrayLink lets communities submit geotagged reports with AI-assisted animal tagging and gives NGOs a clear workflow from new cases to resolution.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/auth" className="btn-primary">Login / Join</Link>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-bold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Citizen uploads photo and picks location on the map.</li>
          <li>TensorFlow.js classifies likely animal type in browser.</li>
          <li>Case enters admin workflow: new, verified, assigned, resolved/rejected.</li>
          <li>Citizen tracks status with case ID + tracking token.</li>
        </ol>
      </div>
    </section>
  );
}
