# Expense API Integration Guide for Mobile App

**Complete Guide for CRUD Operations on Expenses in POS Candy Kush API**

**Last Updated:** January 6, 2026
**API Version:** 1.0
**Base URL:** `https://pos-candy-kush.vercel.app/api/mobile`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Expense Endpoints](#expense-endpoints)
   - [Get All Expenses](#1-get-all-expenses)
   - [Get Expense by ID](#2-get-expense-by-id)
   - [Create Expense](#3-create-expense)
   - [Edit Expense](#4-edit-expense)
   - [Delete Expense](#5-delete-expense)
4. [Request Formats](#request-formats)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)
7. [Testing Examples](#testing-examples)
8. [Mobile Integration](#mobile-integration)

---

## Overview

This guide provides complete documentation for performing CRUD (Create, Read, Update, Delete) operations on expenses through the POS Candy Kush mobile API. The API allows mobile applications to manage business expenses for financial tracking.

**Key Features:**
- ✅ JWT Authentication required
- ✅ Full CRUD operations for expenses
- ✅ Date range filtering for expense reports
- ✅ Automatic validation of required fields
- ✅ Real-time expense tracking

---

## Authentication

All expense API endpoints require JWT authentication.

### Login Process

**Endpoint:** `POST /api/mobile?action=login`

**Request Body:**
```json
{
  "email": "admin@candykush.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "admin@candykush.com",
    "role": "admin"
  }
}
```

**Use the token in Authorization header:**
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## Expense Endpoints

### 1. Get All Expenses

**Endpoint:** `GET /api/mobile?action=get-expenses`

**Optional Query Parameters:**
- `start_date`: Filter expenses from this date (YYYY-MM-DD)
- `end_date`: Filter expenses until this date (YYYY-MM-DD)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "action": "get-expenses",
  "generated_at": "2026-01-06T10:30:00.000Z",
  "data": {
    "expenses": [
      {
        "id": "exp_123",
        "description": "Office supplies",
        "amount": 45.5,
        "date": "2026-01-06",
        "time": "14:30",
        "createdAt": "2026-01-06T14:30:00.000Z"
      }
    ],
    "total": 45.5,
    "count": 1
  }
}
```

### 2. Get Expense by ID

**Endpoint:** `GET /api/mobile?action=get-expense&id={expenseId}`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "action": "get-expense",
  "generated_at": "2026-01-06T10:30:00.000Z",
  "data": {
    "id": "exp_123",
    "description": "Office supplies",
    "amount": 45.5,
    "date": "2026-01-06",
    "time": "14:30",
    "createdAt": "2026-01-06T14:30:00.000Z"
  }
}
```

### 3. Create Expense

**Endpoint:** `POST /api/mobile?action=create-expense`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "description": "Office supplies - printer paper and ink",
  "amount": 45.5,
  "date": "2026-01-06",
  "time": "14:30"
}
```

### 4. Edit Expense

**Endpoint:** `POST /api/mobile?action=edit-expense`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "id": "exp_123",
  "description": "Updated office supplies",
  "amount": 60.0,
  "date": "2026-01-06",
  "time": "15:00"
}
```

### 5. Delete Expense

**Endpoint:** `POST /api/mobile?action=delete-expense`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "id": "exp_123"
}
```

**Alternative: DELETE Method**
**Endpoint:** `DELETE /api/mobile?action=delete-expense&id={expenseId}`

---

## Request Formats

### Create Expense Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Description of the expense |
| `amount` | number | Yes | Expense amount (must be >= 0) |
| `date` | string | Yes | Expense date in YYYY-MM-DD format |
| `time` | string | Yes | Expense time in HH:MM format |

### Edit Expense Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Expense ID to update |
| `description` | string | No | Updated description |
| `amount` | number | No | Updated amount (must be >= 0) |
| `date` | string | No | Updated date in YYYY-MM-DD format |
| `time` | string | No | Updated time in HH:MM format |

### Delete Expense Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Expense ID to delete |

---

## Response Formats

### Success Responses

#### Create Expense Success
```json
{
  "success": true,
  "action": "create-expense",
  "data": {
    "expense": {
      "id": "exp_123",
      "description": "Office supplies - printer paper and ink",
      "amount": 45.5,
      "date": "2026-01-06",
      "time": "14:30"
    }
  }
}
```

#### Edit Expense Success
```json
{
  "success": true,
  "action": "edit-expense",
  "data": {
    "expense": {
      "id": "exp_123",
      "description": "Updated office supplies",
      "amount": 60.0,
      "date": "2026-01-06",
      "time": "15:00"
    }
  }
}
```

#### Delete Expense Success
```json
{
  "success": true,
  "action": "delete-expense",
  "message": "Expense deleted successfully"
}
```

#### Get Expenses Success
```json
{
  "success": true,
  "action": "get-expenses",
  "generated_at": "2026-01-06T10:30:00.000Z",
  "data": {
    "expenses": [
      {
        "id": "exp_123",
        "description": "Office supplies",
        "amount": 45.5,
        "date": "2026-01-06",
        "time": "14:30",
        "createdAt": "2026-01-06T14:30:00.000Z"
      },
      {
        "id": "exp_456",
        "description": "Marketing materials",
        "amount": 120.0,
        "date": "2026-01-05",
        "time": "10:15",
        "createdAt": "2026-01-05T10:15:00.000Z"
      }
    ],
    "total": 165.5,
    "count": 2
  }
}
```

---

## Error Handling

### Common Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Description is required"
}
```

```json
{
  "success": false,
  "error": "Amount must be a non-negative number"
}
```

```json
{
  "success": false,
  "error": "Expense not found"
}
```

### Authentication Errors

**Status Code:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

### Not Found Errors

**Status Code:** `404 Not Found` (for GET single expense)

```json
{
  "success": false,
  "error": "Expense not found"
}
```

### Error Codes and Messages

| Error Message | Cause |
|---------------|-------|
| `"Description is required"` | `description` is empty or missing |
| `"Amount must be a non-negative number"` | `amount` is negative or not a number |
| `"Date is required"` | `date` is missing |
| `"Time is required"` | `time` is missing |
| `"Expense ID is required"` | `id` is missing for edit/delete |
| `"Expense not found"` | Expense with given ID doesn't exist |
| `"Description cannot be empty"` | `description` is empty string when editing |
| `"Missing or invalid authorization header"` | No Bearer token provided |
| `"Invalid or expired token"` | JWT token is invalid |

---

## Testing Examples

### cURL Test Commands

```bash
# 1. Login first
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@candykush.com",
    "password": "admin123"
  }'

# 2. Create expense (replace TOKEN with actual token)
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=create-expense" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "description": "Office supplies - printer paper and ink",
    "amount": 45.50,
    "date": "2026-01-06",
    "time": "14:30"
  }'

# 3. Get all expenses
curl -X GET "https://pos-candy-kush.vercel.app/api/mobile?action=get-expenses" \
  -H "Authorization: Bearer TOKEN"

# 4. Get expenses with date filter
curl -X GET "https://pos-candy-kush.vercel.app/api/mobile?action=get-expenses&start_date=2026-01-01&end_date=2026-01-31" \
  -H "Authorization: Bearer TOKEN"

# 5. Edit expense (replace EXPENSE_ID with actual ID)
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=edit-expense" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "id": "EXPENSE_ID",
    "description": "Updated office supplies",
    "amount": 60.00
  }'

# 6. Delete expense
curl -X POST "https://pos-candy-kush.vercel.app/api/mobile?action=delete-expense" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "id": "EXPENSE_ID"
  }'
```

### JavaScript/Node.js Examples

```javascript
async function expenseCRUDOperations(token) {
  const baseUrl = 'https://pos-candy-kush.vercel.app/api/mobile';

  try {
    // Create expense
    const createResponse = await fetch(`${baseUrl}?action=create-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        description: "Office supplies",
        amount: 45.50,
        date: "2026-01-06",
        time: "14:30"
      })
    });

    const createData = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createData.error}`);
    }

    const expenseId = createData.data.expense.id;
    console.log('Created expense:', expenseId);

    // Get all expenses
    const getAllResponse = await fetch(`${baseUrl}?action=get-expenses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const allExpenses = await getAllResponse.json();
    console.log('Total expenses:', allExpenses.data.count);

    // Edit expense
    const editResponse = await fetch(`${baseUrl}?action=edit-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: expenseId,
        description: "Updated office supplies",
        amount: 60.00
      })
    });

    const editData = await editResponse.json();
    if (!editResponse.ok) {
      throw new Error(`Edit failed: ${editData.error}`);
    }

    console.log('Updated expense amount:', editData.data.expense.amount);

    // Delete expense
    const deleteResponse = await fetch(`${baseUrl}?action=delete-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: expenseId
      })
    });

    const deleteData = await deleteResponse.json();
    if (!deleteResponse.ok) {
      throw new Error(`Delete failed: ${deleteData.error}`);
    }

    console.log('Expense deleted successfully');

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## Mobile Integration

### Kotlin/Android Implementation

```kotlin
// Data Models
data class Expense(
    val id: String,
    val description: String,
    val amount: Double,
    val date: String,
    val time: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class ExpenseListResponse(
    val expenses: List<Expense>,
    val total: Double,
    val count: Int
)

data class ExpenseResponse(
    val expense: Expense
)

data class CreateExpenseRequest(
    val action: String = "create-expense",
    val description: String,
    val amount: Double,
    val date: String,
    val time: String
)

data class EditExpenseRequest(
    val action: String = "edit-expense",
    val id: String,
    val description: String? = null,
    val amount: Double? = null,
    val date: String? = null,
    val time: String? = null
)

data class DeleteExpenseRequest(
    val action: String = "delete-expense",
    val id: String
)

data class ApiResponse<T>(
    val success: Boolean,
    val action: String,
    val data: T? = null,
    val error: String? = null,
    @SerializedName("generated_at") val generatedAt: String? = null,
    val message: String? = null
)

// API Service
interface ExpenseApiService {
    @GET("/api/mobile")
    suspend fun getExpenses(
        @Query("action") action: String = "get-expenses",
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): ApiResponse<ExpenseListResponse>

    @GET("/api/mobile")
    suspend fun getExpense(
        @Query("action") action: String = "get-expense",
        @Query("id") id: String
    ): ApiResponse<ExpenseResponse>

    @POST("/api/mobile")
    suspend fun createExpense(
        @Body request: CreateExpenseRequest
    ): ApiResponse<ExpenseResponse>

    @POST("/api/mobile")
    suspend fun editExpense(
        @Body request: EditExpenseRequest
    ): ApiResponse<ExpenseResponse>

    @POST("/api/mobile")
    suspend fun deleteExpense(
        @Body request: DeleteExpenseRequest
    ): ApiResponse<Unit>

    @DELETE("/api/mobile")
    suspend fun deleteExpenseAlt(
        @Query("action") action: String = "delete-expense",
        @Query("id") id: String
    ): ApiResponse<Unit>
}

// Repository
class ExpenseRepository(private val apiService: ExpenseApiService) {

    suspend fun getAllExpenses(
        startDate: String? = null,
        endDate: String? = null
    ): Result<ExpenseListResponse> {
        return try {
            val response = apiService.getExpenses(
                startDate = startDate,
                endDate = endDate
            )
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getExpenseById(expenseId: String): Result<Expense> {
        return try {
            val response = apiService.getExpense(id = expenseId)
            if (response.success && response.data != null) {
                Result.success(response.data.expense)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createExpense(
        description: String,
        amount: Double,
        date: String,
        time: String
    ): Result<Expense> {
        return try {
            val request = CreateExpenseRequest(
                description = description,
                amount = amount,
                date = date,
                time = time
            )
            val response = apiService.createExpense(request)
            if (response.success && response.data != null) {
                Result.success(response.data.expense)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateExpense(
        expenseId: String,
        description: String? = null,
        amount: Double? = null,
        date: String? = null,
        time: String? = null
    ): Result<Expense> {
        return try {
            val request = EditExpenseRequest(
                id = expenseId,
                description = description,
                amount = amount,
                date = date,
                time = time
            )
            val response = apiService.editExpense(request)
            if (response.success && response.data != null) {
                Result.success(response.data.expense)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteExpense(expenseId: String): Result<Unit> {
        return try {
            val request = DeleteExpenseRequest(id = expenseId)
            val response = apiService.deleteExpense(request)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.error ?: "Unknown error"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ViewModel
class ExpenseViewModel(private val repository: ExpenseRepository) : ViewModel() {

    private val _expenses = MutableStateFlow<List<Expense>>(emptyList())
    val expenses: StateFlow<List<Expense>> = _expenses.asStateFlow()

    private val _selectedExpense = MutableStateFlow<Expense?>(null)
    val selectedExpense: StateFlow<Expense?> = _selectedExpense.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun loadExpenses(startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.getAllExpenses(startDate, endDate).fold(
                onSuccess = { expenseList ->
                    _expenses.value = expenseList.expenses
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )

            _isLoading.value = false
        }
    }

    fun loadExpenseDetails(expenseId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.getExpenseById(expenseId).fold(
                onSuccess = { expense ->
                    _selectedExpense.value = expense
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )

            _isLoading.value = false
        }
    }

    fun createExpense(description: String, amount: Double, date: String, time: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.createExpense(description, amount, date, time).fold(
                onSuccess = { newExpense ->
                    // Reload expenses list
                    loadExpenses()
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )

            _isLoading.value = false
        }
    }

    fun updateExpense(
        expenseId: String,
        description: String? = null,
        amount: Double? = null,
        date: String? = null,
        time: String? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.updateExpense(expenseId, description, amount, date, time).fold(
                onSuccess = { updatedExpense ->
                    _selectedExpense.value = updatedExpense
                    // Reload expenses list
                    loadExpenses()
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )

            _isLoading.value = false
        }
    }

    fun deleteExpense(expenseId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.deleteExpense(expenseId).fold(
                onSuccess = {
                    // Reload expenses list
                    loadExpenses()
                    // Clear selected expense if it was deleted
                    if (_selectedExpense.value?.id == expenseId) {
                        _selectedExpense.value = null
                    }
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )

            _isLoading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }
}
```

### Usage in Android Activity/Fragment

```kotlin
class ExpenseListActivity : AppCompatActivity() {
    private lateinit var apiService: ExpenseApiService
    private lateinit var repository: ExpenseRepository
    private lateinit var viewModel: ExpenseViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_expense_list)

        // Initialize Retrofit
        val retrofit = Retrofit.Builder()
            .baseUrl("https://pos-candy-kush.vercel.app/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(ExpenseApiService::class.java)
        repository = ExpenseRepository(apiService)
        viewModel = ViewModelProvider(this, ExpenseViewModelFactory(repository))
            .get(ExpenseViewModel::class.java)

        // Observe ViewModel
        viewModel.expenses.observe(this) { expenses ->
            updateExpenseList(expenses)
        }

        viewModel.isLoading.observe(this) { isLoading ->
            showLoading(isLoading)
        }

        viewModel.error.observe(this) { error ->
            error?.let { showError(it) }
        }

        // Load expenses
        viewModel.loadExpenses()
    }

    private fun updateExpenseList(expenses: List<Expense>) {
        // Update your RecyclerView adapter
        expenseAdapter.updateExpenses(expenses)
    }

    private fun showLoading(isLoading: Boolean) {
        // Show/hide loading indicator
    }

    private fun showError(error: String) {
        Toast.makeText(this, error, Toast.LENGTH_LONG).show()
        viewModel.clearError()
    }
}

class CreateExpenseActivity : AppCompatActivity() {
    private lateinit var viewModel: ExpenseViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_expense)

        // Get ViewModel from parent activity or create new instance
        viewModel = (application as MyApplication).expenseViewModel

        findViewById<Button>(R.id.saveButton).setOnClickListener {
            createExpense()
        }
    }

    private fun createExpense() {
        val description = findViewById<EditText>(R.id.descriptionEdit).text.toString()
        val amount = findViewById<EditText>(R.id.amountEdit).text.toString().toDoubleOrNull()
        val date = findViewById<EditText>(R.id.dateEdit).text.toString()
        val time = findViewById<EditText>(R.id.timeEdit).text.toString()

        if (description.isBlank() || amount == null || date.isBlank() || time.isBlank()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }

        viewModel.createExpense(description, amount, date, time)
        finish() // Close activity after creating
    }
}
```

---

## 📝 Notes for Mobile Developers

1. **Date and Time Format:** Always use `YYYY-MM-DD` for dates and `HH:MM` for times
2. **Amount Validation:** Ensure amounts are positive numbers before sending
3. **Error Handling:** Always check `response.success` before accessing data
4. **Loading States:** Show loading indicators during API calls
5. **Offline Support:** Consider implementing local caching for offline scenarios
6. **Date Filtering:** Use `start_date` and `end_date` for expense reports
7. **Real-time Updates:** Reload expense list after create/edit/delete operations

---

## 🔧 Troubleshooting

### Common Issues

1. **400 Bad Request**
   - Check all required fields are present and valid
   - Verify date format (YYYY-MM-DD) and time format (HH:MM)
   - Ensure amount is a positive number

2. **401 Unauthorized**
   - Verify JWT token is valid and not expired
   - Check Authorization header format

3. **404 Not Found**
   - Verify expense ID exists before editing/deleting
   - Check for typos in expense IDs

### Testing Checklist

- [ ] Login works and returns valid JWT token
- [ ] Create expense with valid data
- [ ] Get all expenses returns list with totals
- [ ] Get single expense by ID works
- [ ] Date filtering works correctly
- [ ] Edit expense updates data properly
- [ ] Delete expense removes item from list
- [ ] Error handling works for invalid data
- [ ] Loading states work correctly

---

**For additional support, check the main API documentation or contact the development team.**</content>
<parameter name="filePath">/Volumes/SANDISK/Candy Kush/pos-candy-kush/pos-candy-kush/EXPENSE_API_MOBILE_INTEGRATION.md