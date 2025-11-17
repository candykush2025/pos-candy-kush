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

// APK download endpoint
export async function GET() {
  try {
    const apkPath = path.join(process.cwd(), "public", "ck.apk");

    // Check if APK file exists
    if (!fs.existsSync(apkPath)) {
      return NextResponse.json(
        { error: "APK file not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // Read the APK file
    const apkBuffer = fs.readFileSync(apkPath);
    const stats = fs.statSync(apkPath);

    // Return the APK file with proper headers
    return new NextResponse(apkBuffer, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="ck.apk"`,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error downloading APK:", error);
    return NextResponse.json(
      { error: "Failed to download APK" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}
