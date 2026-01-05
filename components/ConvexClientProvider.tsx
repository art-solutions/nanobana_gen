import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";

// Initialize the Convex client with the deployment URL
// This URL is set via environment variable VITE_CONVEX_URL
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  // If Convex URL is not configured, show error
  if (!convex) {
    console.error("VITE_CONVEX_URL not set. Convex features will not work.");
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Configuration Error</h2>
          <p className="text-gray-300 mb-4">
            VITE_CONVEX_URL environment variable is not set. Please add it to your .env.local file.
          </p>
          <code className="block bg-gray-800 p-3 rounded text-xs text-green-400">
            VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud
          </code>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// Export the client for direct API calls if needed
export { convex };
