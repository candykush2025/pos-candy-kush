"use client";

import { useEffect } from "react";

export default function WebDemoPage() {
  useEffect(() => {
    // Redirect to the static HTML file
    window.location.href = "/webdemo/index.html";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading WebDemo...</p>
      </div>
    </div>
  );
}
