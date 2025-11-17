import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// APK metadata endpoint
export async function GET() {
  try {
    // Path to the APK file in the public folder
    const apkPath = path.join(process.cwd(), "public", "ck.apk");

    // Check if APK file exists
    if (!fs.existsSync(apkPath)) {
      console.warn("APK file not found, using fallback metadata");
      return getFallbackMetadata();
    }

    try {
      // Import the APK parser - correct import path
      const ApkParser = require("app-info-parser/src/apk");

      // Parse the APK file
      const parser = new ApkParser(apkPath);
      const result = await parser.parse();

      // Get file size
      const stats = fs.statSync(apkPath);
      const sizeFormatted = formatFileSize(stats.size);

      // Build metadata from parsed APK data
      const apkMetadata = {
        name: result.name || "Candy Kush POS",
        version: result.versionName || "1.0.0",
        versionCode: result.versionCode || 1,
        sizeFormatted,
        developer: "Candy Kush",
        packageName: result.package || "com.candykush.pos",
        icon: "/icons/icon-192x192.svg",
        features: ["Offline Mode", "Fast Sync", "Secure Payments"],
        description:
          "Professional POS system for cannabis dispensaries with offline support",
        downloadUrl: "/api/apk/download", // Updated to use download endpoint
        lastUpdated: new Date().toISOString(),
        minAndroidVersion: "8.0",
        permissions: ["Internet", "Storage", "Camera"],
      };

      return NextResponse.json(apkMetadata, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (parseError) {
      console.error("Error parsing APK file:", parseError);
      return getFallbackMetadata();
    }
  } catch (error) {
    console.error("Error in APK metadata endpoint:", error);
    return getFallbackMetadata();
  }
}

// Fallback metadata when APK parsing fails
function getFallbackMetadata() {
  const apkMetadata = {
    name: "Candy Kush POS",
    version: "1.0.1",
    versionCode: 2,
    sizeFormatted: "6.98 MB",
    developer: "Candy Kush",
    packageName: "com.candykush.pos",
    icon: "/icons/icon-192x192.svg",
    features: ["Offline Mode", "Fast Sync", "Secure Payments"],
    description:
      "Professional POS system for cannabis dispensaries with offline support",
    downloadUrl: "/api/apk/download", // Use download endpoint
    lastUpdated: new Date().toISOString(),
    minAndroidVersion: "8.0",
    permissions: ["Internet", "Storage", "Camera"],
  };

  return NextResponse.json(apkMetadata);
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
