import { NextResponse } from "next/server";

// APK metadata endpoint
export async function GET() {
  try {
    const apkMetadata = {
      name: "Candy Kush POS",
      version: "1.0.1",
      versionCode: 2,
      sizeFormatted: "6.98 MB",
      developer: "Candy Kush",
      packageName: "com.candykush.pos",
      icon: "/icon-192x192.png",
      features: ["Offline Mode", "Fast Sync", "Secure Payments"],
      description:
        "Professional POS system for cannabis dispensaries with offline support",
      downloadUrl: "/ck.apk",
      lastUpdated: new Date().toISOString(),
      minAndroidVersion: "8.0",
      permissions: ["Internet", "Storage", "Camera"],
    };

    return NextResponse.json(apkMetadata);
  } catch (error) {
    console.error("Error fetching APK metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch APK metadata" },
      { status: 500 }
    );
  }
}
