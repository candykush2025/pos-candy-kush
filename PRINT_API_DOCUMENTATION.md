# Thermal Print API Documentation

## Overview

This API provides thermal printing functionality for the POS system. The API ensures that each print job is printed only once - after retrieval, the job is automatically deleted to prevent duplicate prints.

## Base URL

```
https://pos-candy-kush.vercel.app/api/print
```

## Endpoints

### 1. Create Print Job (POST)

Creates a new thermal print job.

**Endpoint:** `POST /api/print`

**Request Body:**

```json
{
  "data": "thermal print data string"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Print job created successfully",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Print data is required"
}
```

### 2. Get Print Job (GET)

Retrieves the current print job and automatically deletes it after retrieval. Subsequent calls will return null.

**Endpoint:** `GET /api/print`

**Success Response - With Job (200):**

```json
{
  "success": true,
  "data": "thermal print data string",
  "timestamp": "2025-11-13T10:30:00.000Z",
  "message": "Print job retrieved and cleared"
}
```

**Success Response - No Job (200):**

```json
{
  "success": true,
  "data": null,
  "message": "No print job available"
}
```

## Android Implementation

### Dependencies

Add to your `build.gradle` (app level):

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### Create Print Job

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class PrintApiService {
    private val client = OkHttpClient()
    private val baseUrl = "https://your-domain.com/api/print"

    fun createPrintJob(printData: String, callback: (Boolean, String?) -> Unit) {
        val json = """
            {
                "data": "$printData"
            }
        """.trimIndent()

        val requestBody = json.toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(baseUrl)
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                val responseBody = response.body?.string()
                callback(response.isSuccessful, responseBody)
            }
        })
    }
}
```

### Get Print Job

```kotlin
fun getPrintJob(callback: (String?, String?) -> Unit) {
    val request = Request.Builder()
        .url(baseUrl)
        .get()
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            callback(null, e.message)
        }

        override fun onResponse(call: Call, response: Response) {
            val responseBody = response.body?.string()
            if (response.isSuccessful && responseBody != null) {
                try {
                    // Parse JSON response
                    val jsonObject = JSONObject(responseBody)
                    val data = jsonObject.optString("data", null)
                    callback(data, null)
                } catch (e: Exception) {
                    callback(null, "Failed to parse response")
                }
            } else {
                callback(null, responseBody ?: "Unknown error")
            }
        })
    }
}
```

### Usage Example

```kotlin
val printService = PrintApiService()

// Create a print job
printService.createPrintJob("Thermal receipt data here") { success, message ->
    if (success) {
        println("Print job created: $message")
    } else {
        println("Error: $message")
    }
}

// Later, retrieve and print the job
printService.getPrintJob { printData, error ->
    if (printData != null) {
        // Send to thermal printer
        thermalPrinter.print(printData)
    } else {
        println("No print job available or error: $error")
    }
}
```

## Important Notes

- Each print job can only be retrieved once. After GET, it's automatically deleted.
- The API uses CORS headers to allow cross-origin requests from mobile apps.
- In production, consider using a proper database instead of in-memory storage.
- Handle network errors and timeouts appropriately in your Android app.
