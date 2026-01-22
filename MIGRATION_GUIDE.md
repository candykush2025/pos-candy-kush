# Migration Guide: Moving to Optimized Firebase Hooks

## 🔄 Quick Migration Steps

This guide shows you how to update your existing components to use the new optimized Firebase hooks that **ALWAYS get fresh data**.

---

## Before & After Examples

### Example 1: Loading Products

#### ❌ BEFORE (Old Method)
```javascript
import { useEffect, useState } from "react";
import { productsService } from "@/lib/firebase/firestore";

function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productsService.getAll();
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

#### ✅ AFTER (Optimized)
```javascript
import { useProducts } from "@/hooks/useFirebaseServices";

function ProductsList() {
  // ALWAYS gets latest products from server
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Simpler code (no useState, no useEffect)
- ✅ Always gets fresh data from server
- ✅ Better error handling
- ✅ Automatic retry on failure
- ✅ Performance tracking included

---

### Example 2: Loading Multiple Collections

#### ❌ BEFORE (Old Method)
```javascript
import { useEffect, useState } from "react";
import { productsService, customersService, categoriesService } from "@/lib/firebase/firestore";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load sequentially (slow!)
        const productsData = await productsService.getAll();
        const customersData = await customersService.getAll();
        const categoriesData = await categoriesService.getAll();
        
        setProducts(productsData);
        setCustomers(customersData);
        setCategories(categoriesData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return <div>...</div>;
}
```

#### ✅ AFTER (Optimized)
```javascript
import { useProducts, useCustomers, useCategories } from "@/hooks/useFirebaseServices";

function Dashboard() {
  // All load in PARALLEL - much faster!
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const isLoading = productsLoading || customersLoading || categoriesLoading;

  if (isLoading) return <div>Loading...</div>;

  return <div>...</div>;
}
```

**Benefits:**
- ✅ Loads in parallel (much faster!)
- ✅ Always gets fresh data
- ✅ Independent loading states
- ✅ Much cleaner code

---

### Example 3: Creating/Updating Data

#### ❌ BEFORE (Old Method)
```javascript
import { useState } from "react";
import { productsService } from "@/lib/firebase/firestore";

function CreateProduct() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    try {
      setLoading(true);
      await productsService.create(data);
      // Need to manually trigger reload of products list
      window.location.reload(); // Bad practice!
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### ✅ AFTER (Optimized)
```javascript
import { useCreateProduct } from "@/hooks/useFirebaseServices";

function CreateProduct() {
  const createProduct = useCreateProduct();

  const handleSubmit = async (data) => {
    try {
      await createProduct.mutateAsync(data);
      // Products list automatically refreshes to show latest data!
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createProduct.isPending}>
        {createProduct.isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
```

**Benefits:**
- ✅ Automatic refresh of related data
- ✅ Built-in loading states
- ✅ No page reload needed
- ✅ Optimistic updates possible

---

### Example 4: Manual Refresh

#### ❌ BEFORE (Old Method)
```javascript
function ProductsList() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    const data = await productsService.getAll();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      <button onClick={loadProducts}>Refresh</button>
      {/* ... */}
    </div>
  );
}
```

#### ✅ AFTER (Optimized)
```javascript
import { useProducts } from "@/hooks/useFirebaseServices";

function ProductsList() {
  const { data: products, refetch, isFetching } = useProducts();

  return (
    <div>
      <button onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? "Refreshing..." : "Refresh"}
      </button>
      {/* ... */}
    </div>
  );
}
```

**Benefits:**
- ✅ Built-in refetch function
- ✅ Loading state included
- ✅ Simpler code

---

### Example 5: Conditional Loading

#### ❌ BEFORE (Old Method)
```javascript
function CustomerDetails({ customerId }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!customerId) return;

    const loadCustomer = async () => {
      const data = await customersService.get(customerId);
      setCustomer(data);
    };

    loadCustomer();
  }, [customerId]);

  return <div>...</div>;
}
```

#### ✅ AFTER (Optimized)
```javascript
import { useQuery } from "@tanstack/react-query";
import { customersService } from "@/lib/firebase/firestore";

function CustomerDetails({ customerId }) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customersService.get(customerId),
    enabled: !!customerId, // Only fetch if customerId exists
    staleTime: 0, // Always get fresh data
    gcTime: 0,
  });

  if (!customerId) return <div>No customer selected</div>;
  if (isLoading) return <div>Loading...</div>;

  return <div>...</div>;
}
```

**Benefits:**
- ✅ Conditional fetching
- ✅ Always fresh data
- ✅ Automatic refetch when customerId changes

---

## 📋 Migration Checklist

For each component that loads Firebase data:

- [ ] Remove `useState` for data storage
- [ ] Remove `useEffect` for data loading
- [ ] Replace with appropriate hook from `useFirebaseServices`
- [ ] Update loading states (`loading` → `isLoading`)
- [ ] Add error handling with `error` from hook
- [ ] Replace manual refresh functions with `refetch()`
- [ ] For mutations, use mutation hooks (`useCreateProduct`, etc.)
- [ ] Test that data always shows latest values

---

## 🎯 Available Hooks

All hooks ALWAYS fetch fresh data from server (no cache):

### Query Hooks
- `useProducts(options)` - Get all products
- `useCustomers(options)` - Get all customers
- `useCategories(options)` - Get all categories
- `useCashbackRules()` - Get cashback rules
- `usePointUsageRules()` - Get point usage rules
- `useDiscounts(options)` - Get discounts
- `useActiveShift(userId)` - Get active shift

### Mutation Hooks
- `useCreateProduct()` - Create product (auto-refresh)
- `useUpdateProduct()` - Update product (auto-refresh)
- `useDeleteProduct()` - Delete product (auto-refresh)

### Utility Hooks
- `useRefreshAll()` - Force refresh all data
- `useFreshData()` - Access all refresh utilities

---

## 🚨 Important Notes

### ✅ DO:
- Use the new hooks for all Firebase data loading
- Let React Query handle loading states
- Use mutation hooks for create/update/delete
- Trust that data is always fresh

### ❌ DON'T:
- Don't use `useState` for Firebase data
- Don't use `useEffect` for data loading
- Don't manually manage loading states
- Don't reload the page to refresh data

---

## 🔍 Debugging

If something doesn't work:

1. **Check console logs** - Performance metrics are logged
2. **Check React Query DevTools** - Shows all queries and their status
3. **Verify data freshness** - Make change in Firebase, should appear immediately
4. **Check network tab** - Should see "From server" not "From cache"

---

## 🆘 Need Help?

Common issues and solutions:

### Issue: Data not updating after mutation
**Solution:** Make sure you're using mutation hooks (`useCreateProduct`, etc.) which automatically trigger refetch.

### Issue: Getting old cached data
**Solution:** Check that `staleTime: 0` and `gcTime: 0` are set in query client config.

### Issue: Too many requests
**Solution:** That's actually good! It means you're always getting fresh data. The requests are optimized and fast.

### Issue: Component re-renders too much
**Solution:** Use React Query's `isFetching` vs `isLoading` to differentiate initial load from background refresh.

---

## 📚 Additional Resources

- Full documentation: `FIREBASE_OPTIMIZATION_COMPLETE.md`
- Example component: `src/components/examples/OptimizedDataExample.jsx`
- Hooks source: `src/hooks/useFirebaseServices.js`
- Utilities: `src/lib/fresh-data.js`
