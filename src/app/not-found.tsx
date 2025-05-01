// app/not-found.tsx
"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-zinc-900 p-6">
      <h1 className="text-6xl font-bold mb-4">404, page not found</h1>
      <p className="text-xl mb-6">You just went off the map, soldier. This page doesn't exist.</p>

      <div className="p-4 rounded-lg border border-gray-400">
        <p className="mb-2">Maybe you:</p>
        <ul className="list-disc list-inside text-zinc-400">
          <li>typed the URL wrong</li>
          <li>clicked a broken link</li>
          <li>were chasing easter eggs like it's GTA</li>
        </ul>
      </div>

      <Link
        href="/"
        className="mt-6 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded transition duration-300"
      >
        Take me back to safety (Home)
      </Link>

      <p className="mt-4 text-sm text-zinc-500">Error Code: #404_NOT_FOUND</p>
    </div>
  );
}
