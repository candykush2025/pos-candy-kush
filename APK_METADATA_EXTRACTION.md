# Candy Kush POS APK API

Public API for accessing Android APK metadata and download functionality for the Candy Kush POS system.

## Base URL

```
https://pos-candy-kush.vercel.app/api/apk
```

## Endpoints

### GET /api/apk

Retrieves comprehensive metadata about the latest APK version.

#### Response

```json
{
  "name": "Candy Kush POS",
  "version": "1.0.5",
  "versionCode": 6,
  "sizeFormatted": "7 MB",
  "developer": "Candy Kush",
  "packageName": "com.blackcode.poscandykush",
  "icon": "/icons/icon-192x192.svg",
  "features": ["Offline Mode", "Fast Sync", "Secure Payments"],
  "description": "Professional POS system for cannabis dispensaries with offline support",
  "downloadUrl": "/api/apk/download",
  "lastUpdated": "2025-11-15T08:01:15.178Z",
  "minAndroidVersion": "8.0",
  "permissions": ["Internet", "Storage", "Camera"]
}
```

#### Usage Examples

**JavaScript/Fetch:**

```javascript
const response = await fetch("https://pos-candy-kush.vercel.app/api/apk");
const metadata = await response.json();
console.log(`Latest version: ${metadata.version} (${metadata.sizeFormatted})`);
```

**cURL:**

```bash
curl https://pos-candy-kush.vercel.app/api/apk
```

**Python:**

```python
import requests

response = requests.get('https://pos-candy-kush.vercel.app/api/apk')
metadata = response.json()
print(f"Download: {metadata['downloadUrl']}")
```

### GET /api/apk/download

Downloads the APK file directly.

#### Response

Binary APK file with appropriate headers:

- `Content-Type: application/vnd.android.package-archive`
- `Content-Disposition: attachment; filename="ck.apk"`

#### Usage Examples

**Browser Download:**

```javascript
const response = await fetch(
  "https://pos-candy-kush.vercel.app/api/apk/download"
);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "ck.apk";
a.click();
```

**cURL Download:**

```bash
curl https://pos-candy-kush.vercel.app/api/apk/download -o candy-kush-pos.apk
```

**Wget Download:**

```bash
wget https://pos-candy-kush.vercel.app/api/apk/download -O candy-kush-pos.apk
```

## Response Fields

| Field               | Type   | Description                            |
| ------------------- | ------ | -------------------------------------- |
| `name`              | string | Application display name               |
| `version`           | string | Human-readable version (e.g., "1.0.5") |
| `versionCode`       | number | Internal version code                  |
| `sizeFormatted`     | string | File size in human-readable format     |
| `developer`         | string | Application developer                  |
| `packageName`       | string | Android package identifier             |
| `icon`              | string | Path to application icon               |
| `features`          | array  | List of key features                   |
| `description`       | string | Application description                |
| `downloadUrl`       | string | Direct download endpoint               |
| `lastUpdated`       | string | ISO timestamp of last update           |
| `minAndroidVersion` | string | Minimum Android version required       |
| `permissions`       | array  | Required Android permissions           |

## Error Handling

### Metadata Endpoint Errors

```json
{
  "error": "Failed to fetch APK metadata"
}
```

**Status Codes:**

- `200`: Success
- `500`: Server error

### Download Endpoint Errors

**Status Codes:**

- `200`: Success (APK file download)
- `404`: APK file not found
- `500`: Server error

## CORS Policy

All endpoints are configured for public access with permissive CORS headers:

- ✅ `Access-Control-Allow-Origin: *`
- ✅ `Access-Control-Allow-Methods: GET, OPTIONS`
- ✅ `Access-Control-Allow-Headers: *`

## Rate Limiting

- No rate limiting implemented
- Consider implementing if used in high-traffic scenarios

## Versioning

- API endpoints are not versioned
- Breaking changes will be communicated via documentation updates

## Integration Examples

### Web Application Integration

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Candy Kush POS Download</title>
  </head>
  <body>
    <h1>Candy Kush POS</h1>
    <div id="app-info"></div>
    <button id="download-btn">Download APK</button>

    <script>
      async function loadAppInfo() {
        try {
          const response = await fetch(
            "https://pos-candy-kush.vercel.app/api/apk"
          );
          const data = await response.json();

          document.getElementById("app-info").innerHTML = `
                    <p><strong>Version:</strong> ${data.version}</p>
                    <p><strong>Size:</strong> ${data.sizeFormatted}</p>
                    <p><strong>Developer:</strong> ${data.developer}</p>
                `;

          document.getElementById("download-btn").onclick = () =>
            downloadAPK(data.downloadUrl);
        } catch (error) {
          console.error("Failed to load app info:", error);
        }
      }

      async function downloadAPK(url) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "candy-kush-pos.apk";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          console.error("Download failed:", error);
        }
      }

      loadAppInfo();
    </script>
  </body>
</html>
```

### Mobile App Integration

```javascript
// React Native / Expo
const downloadAPK = async () => {
  try {
    // Get metadata
    const metadataResponse = await fetch(
      "https://pos-candy-kush.vercel.app/api/apk"
    );
    const metadata = await metadataResponse.json();

    // Download APK
    const apkResponse = await fetch(metadata.downloadUrl);
    const apkBlob = await apkResponse.blob();

    // Save to device (platform-specific implementation needed)
    // For React Native, use FileSystem or Share API
    console.log("APK downloaded successfully");
  } catch (error) {
    console.error("Download failed:", error);
  }
};
```

### Command Line Integration

```bash
#!/bin/bash
# Download latest APK version

API_URL="https://pos-candy-kush.vercel.app/api/apk"
DOWNLOAD_DIR="./downloads"

# Get metadata
echo "Fetching APK metadata..."
metadata=$(curl -s "$API_URL")

# Extract version and download URL
version=$(echo "$metadata" | jq -r '.version')
download_url=$(echo "$metadata" | jq -r '.downloadUrl')

echo "Latest version: $version"
echo "Downloading APK..."

# Download APK
curl -L "$download_url" -o "$DOWNLOAD_DIR/candy-kush-pos-$version.apk"

echo "Download complete!"
```

## Support

For API issues or questions:

- Check the response format matches the documentation
- Verify network connectivity to the API endpoints
- Ensure proper CORS handling in your application

## Changelog

### Version 1.0.0

- Initial API release
- Basic metadata and download endpoints
- Public CORS access enabled
