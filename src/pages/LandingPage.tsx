import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="font-semibold tracking-wide">Timing</div>
          <Link
            to="/login"
            className="px-4 py-2 rounded bg-white text-black font-medium hover:opacity-90"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Minimal timing dashboard for race events.
          </h1>
          <p className="mt-4 text-neutral-300">
            Manage multiple events per organizer. View live timing and results. Keep the UI clean and fast.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/login" className="px-5 py-3 rounded bg-white text-black font-semibold">
              Get started
            </Link>
            <Link to="/app" className="px-5 py-3 rounded border border-neutral-700 text-white hover:bg-neutral-900">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}