# Print Job API Documentation for Android

## Overview

This API provides a **print job queue system** for the POS. When an order is completed on the web, a print job is created. Your Android app polls this API to fetch pending jobs, prints them, and confirms completion.

## Base URL

```
https://pos-candy-kush.vercel.app/api/print
```

---

## Print Job Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRINT JOB FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CASHIER completes order on Web POS                              │
│           │                                                         │
│           ▼                                                         │
│  2. Web POS calls POST /api/print                                   │
│     - Creates print job with status: "pending"                      │
│     - Returns jobId: "PJ-1733401234567-1"                          │
│           │                                                         │
│           ▼                                                         │
│  3. ANDROID APP polls GET /api/print every 2 seconds                │
│     - Checks for pending print jobs                                 │
│     - If found: receives job data + jobId                           │
│     - Job status changes to: "processing"                           │
│           │                                                         │
│           ▼                                                         │
│  4. ANDROID APP prints receipt to thermal printer                   │
│           │                                                         │
│           ▼                                                         │
│  5. ANDROID APP calls PUT /api/print                                │
│     - Sends: { jobId: "PJ-xxx", status: "printed" }                │
│     - If print failed: { jobId: "PJ-xxx", status: "failed" }       │
│           │                                                         │
│           ▼                                                         │
│  6. API removes job from queue (prevents duplicate printing)        │
│     - If failed: job returns to "pending" for retry (max 3 times)  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Job Status Lifecycle

```
pending → processing → printed ✓ (removed from queue)
                    → failed → pending (retry up to 3x)
```

---

## API Endpoints

### 1. GET - Fetch Pending Print Job

**Android calls this every 2 seconds to check for new print jobs.**

**Endpoint:** `GET /api/print`

**Response (with pending job):**

```json
{
  "success": true,
  "data": {
    "order": {
      "receiptNumber": "RCP-20251205-001",
      "total": 150.0,
      "items": [
        {
          "name": "Product A",
          "quantity": 2,
          "price": 50.0,
          "total": 100.0
        },
        {
          "name": "Product B",
          "quantity": 1,
          "price": 50.0,
          "total": 50.0
        }
      ],
      "paymentMethod": "cash",
      "cashReceived": 200,
      "change": 50
    },
    "cashier": "John Doe",
    "timestamp": "2025-12-05T10:30:00.000Z",
    "type": "receipt"
  },
  "jobId": "PJ-1733401234567-1",
  "timestamp": "2025-12-05T10:30:00.000Z",
  "attempts": 1,
  "message": "Print job retrieved - please confirm when printed"
}
```

**Response (no pending job):**

```json
{
  "success": true,
  "data": null,
  "message": "No pending print job"
}
```

**Important:** When you receive a job, it's marked as "processing". You MUST call PUT to confirm printing or it will be stuck.

---

### 2. PUT - Confirm Print Completed

**Android calls this AFTER successfully printing to remove job from queue.**

**Endpoint:** `PUT /api/print`

**Request Body (success):**

```json
{
  "jobId": "PJ-1733401234567-1",
  "status": "printed"
}
```

**Request Body (failed):**

```json
{
  "jobId": "PJ-1733401234567-1",
  "status": "failed",
  "error": "Printer not connected"
}
```

**Valid Status Values:**
| Status | Description |
|--------|-------------|
| `printed` | Print completed successfully - job will be removed |
| `failed` | Print failed - job will retry (max 3 attempts) |

**Response (success):**

```json
{
  "success": true,
  "message": "Print job completed successfully",
  "data": {
    "jobId": "PJ-1733401234567-1",
    "status": "printed",
    "attempts": 1,
    "updatedAt": "2025-12-05T10:30:05.000Z"
  }
}
```

**Response (failed, will retry):**

```json
{
  "success": true,
  "message": "Print job failed - will retry",
  "data": {
    "jobId": "PJ-1733401234567-1",
    "status": "pending",
    "attempts": 1,
    "updatedAt": "2025-12-05T10:30:05.000Z"
  }
}
```

---

### 3. GET - List All Jobs (Debug)

**Endpoint:** `GET /api/print?list=true`

```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "PJ-1733401234567-1",
      "status": "pending",
      "attempts": 0,
      "createdAt": "2025-12-05T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### 4. DELETE - Clear All Jobs (Debug)

**Endpoint:** `DELETE /api/print`

---

## Android Implementation (Kotlin)

### Dependencies (build.gradle)

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### Complete Print Service Class

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson
import com.google.gson.JsonObject
import java.io.IOException

class PrintJobService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    private val gson = Gson()
    private val baseUrl = "https://pos-candy-kush.vercel.app/api/print"

    /**
     * Fetch next pending print job
     * Call this every 2 seconds
     */
    fun fetchPrintJob(callback: (PrintJob?, String?) -> Unit) {
        val request = Request.Builder()
            .url(baseUrl)
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, "Network error: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val body = response.body?.string()
                    val json = gson.fromJson(body, JsonObject::class.java)

                    if (json.get("success").asBoolean) {
                        val data = json.get("data")
                        if (data != null && !data.isJsonNull) {
                            val jobId = json.get("jobId").asString
                            val attempts = json.get("attempts").asInt
                            val printJob = PrintJob(
                                jobId = jobId,
                                data = gson.fromJson(data, PrintData::class.java),
                                attempts = attempts
                            )
                            callback(printJob, null)
                        } else {
                            // No pending job
                            callback(null, null)
                        }
                    } else {
                        callback(null, json.get("error")?.asString ?: "Unknown error")
                    }
                } catch (e: Exception) {
                    callback(null, "Parse error: ${e.message}")
                }
            }
        })
    }

    /**
     * Confirm print job completed successfully
     * MUST be called after printing to remove job from queue
     */
    fun confirmPrinted(jobId: String, callback: (Boolean, String?) -> Unit) {
        sendStatus(jobId, "printed", null, callback)
    }

    /**
     * Report print job failed
     * Job will be retried automatically (max 3 times)
     */
    fun reportFailed(jobId: String, error: String, callback: (Boolean, String?) -> Unit) {
        sendStatus(jobId, "failed", error, callback)
    }

    private fun sendStatus(
        jobId: String,
        status: String,
        error: String?,
        callback: (Boolean, String?) -> Unit
    ) {
        val json = JsonObject().apply {
            addProperty("jobId", jobId)
            addProperty("status", status)
            error?.let { addProperty("error", it) }
        }

        val body = json.toString()
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(baseUrl)
            .put(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, "Network error: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                val success = response.isSuccessful
                if (!success) {
                    val body = response.body?.string()
                    callback(false, "API error: $body")
                } else {
                    callback(true, null)
                }
            }
        })
    }
}

// Data classes
data class PrintJob(
    val jobId: String,
    val data: PrintData,
    val attempts: Int
)

data class PrintData(
    val order: OrderData?,
    val cashier: String?,
    val timestamp: String?,
    val type: String?
)

data class OrderData(
    val receiptNumber: String?,
    val total: Double?,
    val items: List<OrderItem>?,
    val paymentMethod: String?,
    val cashReceived: Double?,
    val change: Double?,
    val customer: CustomerData?
)

data class OrderItem(
    val name: String?,
    val quantity: Int?,
    val price: Double?,
    val total: Double?,
    val sku: String?
)

data class CustomerData(
    val name: String?,
    val phone: String?,
    val email: String?
)
```

### Print Activity with Polling

```kotlin
import android.os.Handler
import android.os.Looper
import android.util.Log

class PrintActivity : AppCompatActivity() {
    private val printService = PrintJobService()
    private var pollingHandler: Handler? = null
    private var pollingRunnable: Runnable? = null
    private var isPolling = false

    private val POLL_INTERVAL = 2000L // 2 seconds

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_print)

        startPolling()
    }

    private fun startPolling() {
        if (isPolling) return
        isPolling = true

        pollingHandler = Handler(Looper.getMainLooper())
        pollingRunnable = object : Runnable {
            override fun run() {
                checkForPrintJob()
                pollingHandler?.postDelayed(this, POLL_INTERVAL)
            }
        }
        pollingHandler?.post(pollingRunnable!!)

        Log.d("Print", "Started polling for print jobs")
    }

    private fun stopPolling() {
        isPolling = false
        pollingRunnable?.let { pollingHandler?.removeCallbacks(it) }
        Log.d("Print", "Stopped polling")
    }

    private fun checkForPrintJob() {
        printService.fetchPrintJob { printJob, error ->
            runOnUiThread {
                if (error != null) {
                    Log.e("Print", "Error fetching job: $error")
                    return@runOnUiThread
                }

                if (printJob != null) {
                    Log.d("Print", "Received print job: ${printJob.jobId}")
                    processPrintJob(printJob)
                }
                // If printJob is null, no pending jobs - continue polling
            }
        }
    }

    private fun processPrintJob(job: PrintJob) {
        // Temporarily stop polling while printing
        stopPolling()

        try {
            // Format receipt data
            val receiptText = formatReceipt(job.data)

            // Print to thermal printer
            val success = printToThermalPrinter(receiptText)

            if (success) {
                // IMPORTANT: Confirm print completed
                printService.confirmPrinted(job.jobId) { confirmed, error ->
                    runOnUiThread {
                        if (confirmed) {
                            Log.d("Print", "Job ${job.jobId} confirmed as printed")
                            showSuccess("Receipt printed successfully")
                        } else {
                            Log.e("Print", "Failed to confirm: $error")
                        }
                        // Resume polling
                        startPolling()
                    }
                }
            } else {
                throw Exception("Printer returned error")
            }

        } catch (e: Exception) {
            Log.e("Print", "Print failed: ${e.message}")

            // Report failure - API will retry automatically
            printService.reportFailed(job.jobId, e.message ?: "Unknown error") { _, _ ->
                runOnUiThread {
                    showError("Print failed: ${e.message}")
                    // Resume polling
                    startPolling()
                }
            }
        }
    }

    private fun formatReceipt(data: PrintData): String {
        val sb = StringBuilder()
        val order = data.order ?: return "Invalid order data"

        // Header
        sb.appendLine("================================")
        sb.appendLine("        CANDY KUSH POS")
        sb.appendLine("================================")
        sb.appendLine()
        sb.appendLine("Receipt: ${order.receiptNumber}")
        sb.appendLine("Date: ${data.timestamp}")
        sb.appendLine("Cashier: ${data.cashier}")
        sb.appendLine("--------------------------------")

        // Items
        order.items?.forEach { item ->
            sb.appendLine("${item.name}")
            sb.appendLine("  ${item.quantity} x ${item.price} = ${item.total}")
        }

        sb.appendLine("--------------------------------")
        sb.appendLine("TOTAL: ${order.total}")
        sb.appendLine()

        // Payment info
        if (order.paymentMethod == "cash") {
            sb.appendLine("Cash: ${order.cashReceived}")
            sb.appendLine("Change: ${order.change}")
        } else {
            sb.appendLine("Payment: ${order.paymentMethod}")
        }

        // Customer
        order.customer?.let { customer ->
            sb.appendLine()
            sb.appendLine("Customer: ${customer.name}")
        }

        sb.appendLine()
        sb.appendLine("================================")
        sb.appendLine("       Thank you!")
        sb.appendLine("================================")

        return sb.toString()
    }

    private fun printToThermalPrinter(text: String): Boolean {
        // TODO: Implement your thermal printer code here
        // Example using SmartPOS SDK:
        // return printerManager.print(text)

        Log.d("Print", "Printing:\n$text")
        return true // Return actual print result
    }

    private fun showSuccess(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    override fun onResume() {
        super.onResume()
        startPolling()
    }

    override fun onPause() {
        super.onPause()
        // Keep polling in background for production
        // stopPolling()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopPolling()
    }
}
```

---

## Important Rules for Android App

### ✅ DO:

1. Poll `GET /api/print` every **2 seconds**
2. Always save the `jobId` when you receive a print job
3. Always call `PUT /api/print` with `jobId` after printing
4. Handle network errors gracefully
5. Stop polling temporarily while printing to avoid duplicate fetches

### ❌ DON'T:

1. Don't forget to confirm print with PUT - job will be stuck!
2. Don't poll faster than 2 seconds - unnecessary load
3. Don't ignore the `jobId` - it's required for confirmation

---

## Testing

### Test with curl

```bash
# 1. Create a test print job
curl -X POST https://pos-candy-kush.vercel.app/api/print \
  -H "Content-Type: application/json" \
  -d '{"data": {"order": {"receiptNumber": "TEST-001", "total": 100}, "cashier": "Test", "type": "receipt"}}'

# 2. Fetch the print job (simulates Android polling)
curl -X GET https://pos-candy-kush.vercel.app/api/print

# 3. Confirm print completed (use the jobId from step 2)
curl -X PUT https://pos-candy-kush.vercel.app/api/print \
  -H "Content-Type: application/json" \
  -d '{"jobId": "PJ-xxx-x", "status": "printed"}'

# 4. Check queue is empty
curl -X GET https://pos-candy-kush.vercel.app/api/print

# List all jobs (debug)
curl -X GET "https://pos-candy-kush.vercel.app/api/print?list=true"

# Clear all jobs (debug)
curl -X DELETE https://pos-candy-kush.vercel.app/api/print
```

---

## Error Handling

| Scenario                   | What Happens                                                 |
| -------------------------- | ------------------------------------------------------------ |
| Network error on GET       | Android retries on next poll (2 sec)                         |
| Network error on PUT       | Job stays in "processing" - manual intervention needed       |
| Print failed               | Android sends `status: "failed"` → Job retries automatically |
| Max retries (3x) reached   | Job stays in "failed" status                                 |
| Android crashes before PUT | Job stuck in "processing" - manual clear needed              |

---

## Troubleshooting

**Job stuck in "processing":**

- Call `DELETE /api/print` to clear all jobs
- Or wait for server restart (clears in-memory queue)

**Duplicate prints:**

- This shouldn't happen if you always call PUT after printing
- Check that you're saving `jobId` correctly

**No jobs appearing:**

- Check Web POS is calling POST correctly
- Check `GET /api/print?list=true` to see queue status
