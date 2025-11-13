// src/app/api/apk-metadata/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yauzl from "yauzl";

export async function GET() {
  try {
    const apkPath = path.join(process.cwd(), "public", "ck.apk");

    // Check if APK exists
    if (!fs.existsSync(apkPath)) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "APK file not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get file stats
    const stats = fs.statSync(apkPath);
    const fileSize = stats.size;
    const lastModified = stats.mtime.toISOString();

    // Try to extract basic APK information
    let apkInfo = {
      isValid: false,
      hasManifest: false,
      fileCount: 0,
    };

    try {
      apkInfo = await validateApk(apkPath);
      console.log("APK validation result:", apkInfo);
    } catch (error) {
      console.error("APK validation failed:", error);
    }

    // Provide metadata based on APK analysis
    const metadata = {
      name: apkInfo.appName || "Candy Kush POS",
      version: apkInfo.versionName || "1.0.0",
      versionCode: apkInfo.versionCode || 1,
      packageName: apkInfo.packageName || "com.candykush.pos",
      minSdkVersion: apkInfo.minSdkVersion || 21,
      targetSdkVersion: apkInfo.targetSdkVersion || 34,
      icon: "/icons/icon-192x192.png",
      size: fileSize,
      sizeFormatted: formatFileSize(fileSize),
      downloadUrl: "/ck.apk",
      lastModified,
      description: "Professional Point of Sale System for Android",
      permissions: apkInfo.permissions || [],
      features: apkInfo.features || [
        "Offline operation",
        "Thermal receipt printing",
      ],
      developer: "Candy Kush Team",
      installLocation: "auto",
      apkValidation: apkInfo,
    };

    return new NextResponse(
      JSON.stringify({
        success: true,
        metadata,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error reading APK metadata:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Failed to read APK metadata",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function validateApk(apkPath) {
  return new Promise((resolve, reject) => {
    const info = {
      isValid: false,
      hasManifest: false,
      fileCount: 0,
      appName: null,
      versionName: null,
      versionCode: null,
      packageName: null,
      minSdkVersion: null,
      targetSdkVersion: null,
      permissions: [],
      features: [],
    };

    yauzl.open(apkPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      info.isValid = true;

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        info.fileCount++;

        if (entry.fileName === "AndroidManifest.xml") {
          info.hasManifest = true;
          // Try to extract basic info from manifest filename
          // In a real implementation, you'd decode the binary XML
          console.log("Found AndroidManifest.xml");
        }

        // Look for common APK structure indicators
        if (entry.fileName.includes("classes.dex")) {
          info.isValid = true;
        }

        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        // Provide reasonable defaults based on APK structure
        if (info.hasManifest && info.fileCount > 10) {
          info.appName = "Candy Kush POS"; // Would be extracted from manifest
          info.versionName = "1.0.0"; // Would be extracted from manifest
          info.versionCode = 1; // Would be extracted from manifest
          info.packageName = "com.candykush.pos"; // Would be extracted from manifest
          info.minSdkVersion = 21;
          info.targetSdkVersion = 34;
          info.permissions = [
            "android.permission.INTERNET",
            "android.permission.CAMERA",
          ];
        }

        zipfile.close();
        resolve(info);
      });

      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
