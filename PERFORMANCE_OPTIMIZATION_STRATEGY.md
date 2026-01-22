# Performance Optimization Strategy for SalesSection.jsx

## Executive Summary

The `SalesSection.jsx` component is experiencing severe performance issues manifested as browser performance violations:

- `setTimeout` handler violations (120ms, 65ms)
- React scheduler `message` handler violations (400-800ms)

Root cause analysis reveals multiple bottlenecks causing excessive main thread blocking. This strategy outlines a comprehensive 3-phase optimization approach to eliminate violations and improve user experience.

## Current Performance Issues

### 1. Cashback Calculation Bottleneck

**Impact**: Critical - Primary source of setTimeout violations

**Problem Details**:

- `useEffect` with `setTimeout(calculateCashbackNow(), 50)` triggers on every cart/customer/rules change
- `calculateCashbackNow()` iterates through all cart items calling `cashbackRulesService.calculateItemCashback()`
- Multiple manual `setTimeout` calls (50ms, 100ms) throughout component
- No memoization despite code comments indicating `useMemo` should be used

**Current Code Pattern**:

```jsx
useEffect(() => {
  const t = setTimeout(() => calculateCashbackNow(), 50);
  return () => clearTimeout(t);
}, [items, cartCustomer, cashbackRules]);
```

### 2. Product Filtering Performance

**Impact**: High - Causes excessive re-computations

**Problem Details**:

- Filtering `useEffect` runs on every `searchQuery`, `products`, `selectedCategory`, `categoriesData` change
- `getProductCategory()` performs O(n×m) `find()` operations on categories array
- No debouncing on search input - filters on every keystroke
- Filtering happens synchronously without memoization

**Current Code Pattern**:

```jsx
useEffect(() => {
  let filtered = products;
  // Expensive filtering logic...
  setFilteredProducts(filtered);
}, [searchQuery, products, selectedCategory, categoriesData]);
```

### 3. Render-Time Computations

**Impact**: High - Expensive operations per product per render

**Problem Details**:

- Each product card calls multiple expensive functions:
  - `isProductAvailable()` - checks nested variants/stores objects
  - `getProductStock()` - tries 10+ field variations with nested lookups
  - `getProductImage()`, `getProductColor()` - simple but called repeatedly
- With 100+ products, these run on every render cycle

**Current Render Pattern**:

```jsx
{
  filteredProducts.map((product) => {
    const availableForSale = isProductAvailable(product); // Expensive
    const stock = getProductStock(product); // Expensive
    const imageUrl = getProductImage(product); // Simple but repeated
    // ... render logic
  });
}
```

### 4. React Scheduler Overload

**Impact**: Critical - Causes message handler violations

**Problem Details**:

- Too many state updates triggering cascading re-renders
- No batching of related state changes
- Expensive computations blocking React's reconciliation
- Missing memoization causing unnecessary re-computations

## Phase 1: Critical Fixes (Immediate Impact)

### 1.1 Convert Cashback Calculation to useMemo

**Objective**: Eliminate setTimeout violations by removing manual timeouts

**Implementation**:

```jsx
// Replace useState + useEffect pattern with useMemo
const calculatedCashback = useMemo(() => {
  // Move calculateCashbackNow logic here
  if (!cartCustomer || cartCustomer.isNoMember === true) {
    return { totalPoints: 0, itemBreakdown: [] };
  }

  if (!items?.length) {
    return { totalPoints: 0, itemBreakdown: [] };
  }

  if (!cashbackRules?.length) {
    return { totalPoints: 0, itemBreakdown: [] };
  }

  const total = getTotal();
  let totalPoints = 0;
  const itemBreakdown = [];

  for (const item of items) {
    const itemData = {
      productId: item.productId || item.id,
      categoryId: item.categoryId,
      price: item.price,
      quantity: item.quantity,
    };

    const result = cashbackRulesService.calculateItemCashback(
      itemData,
      cashbackRules,
      total,
    );

    if (result && result.points > 0) {
      totalPoints += result.points;
      itemBreakdown.push({
        itemId: itemData.productId,
        itemName: item.name,
        points: result.points,
        ruleApplied: result.ruleApplied,
      });
    }
  }

  return { totalPoints, itemBreakdown };
}, [items, cartCustomer, cashbackRules, getTotal]);
```

**Changes Required**:

- Remove `calculatedCashback` useState
- Remove cashback calculation useEffect
- Remove all manual `setTimeout(() => calculateCashbackNow(), X)` calls
- Update all references to use the memoized value

**Expected Impact**: 90% reduction in setTimeout violations

### 1.2 Implement Debounced Search Filtering

**Objective**: Prevent excessive filtering during typing

**Implementation**:

```jsx
// Add debounced search state
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
const searchTimeoutRef = useRef(null);

// Debounce search input
const handleSearchChange = useCallback((value) => {
  setSearchQuery(value);

  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  searchTimeoutRef.current = setTimeout(() => {
    setDebouncedSearchQuery(value);
  }, 300);
}, []);

// Use debounced query in filtering
const filteredProducts = useMemo(() => {
  let filtered = products;

  // Category filter
  if (selectedCategory !== "all") {
    filtered = filtered.filter((p) => {
      const productCategory = getProductCategory(p);
      return productCategory === selectedCategory;
    });
  }

  // Search filter (using debounced query)
  if (debouncedSearchQuery.trim() !== "") {
    const query = debouncedSearchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.barcode?.includes(query) ||
        p.sku?.toLowerCase().includes(query),
    );
  }

  return filtered;
}, [
  products,
  selectedCategory,
  categoriesData,
  debouncedSearchQuery,
  getProductCategory,
]);
```

**Changes Required**:

- Add debounced search state and timeout logic
- Convert filtering useEffect to useMemo
- Update search input to use debounced handler

**Expected Impact**: 70% reduction in filtering computations during typing

## Phase 2: Render Optimization (Medium Impact)

### 2.1 Memoize Helper Functions

**Objective**: Cache expensive function results

**Implementation**:

```jsx
// Memoize expensive helper functions
const memoizedGetProductCategory = useCallback(
  (product) => {
    if (!product) return null;

    // Cache category lookups
    const cacheKey = `${product.categoryId}-${categoriesData.length}`;
    if (categoryCache.current.has(cacheKey)) {
      return categoryCache.current.get(cacheKey);
    }

    // Existing logic...
    const category = categoriesData.find(
      (cat) => cat.id === product.categoryId,
    );
    const result = category
      ? category.name
      : product.categoryName ||
        product.category ||
        product.categoryLabel ||
        null;

    categoryCache.current.set(cacheKey, result);
    return result;
  },
  [categoriesData],
);

const memoizedGetProductStock = useCallback((product) => {
  if (!product) return 0;

  // Cache stock calculations
  const cacheKey = `${product.id}-stock`;
  if (stockCache.current.has(cacheKey)) {
    return stockCache.current.get(cacheKey);
  }

  // Existing logic...
  // Calculate stock...
  stockCache.current.set(cacheKey, result);
  return result;
}, []);

const memoizedIsProductAvailable = useCallback((product) => {
  // Similar caching pattern...
}, []);
```

**Changes Required**:

- Add cache refs for each function
- Wrap existing functions with useCallback and caching logic
- Clear caches when relevant data changes

### 2.2 Pre-compute Product Display Data

**Objective**: Move expensive computations out of render

**Implementation**:

```jsx
// Enhanced filtered products with pre-computed display data
const productsWithDisplayData = useMemo(() => {
  return filteredProducts.map((product) => {
    const trackStock = parseBoolean(product.trackStock, true);
    const availableForSale = memoizedIsProductAvailable(product);
    const stock = memoizedGetProductStock(product);
    const imageUrl = memoizedGetProductImage(product);
    const productColor = memoizedGetProductColor(product);
    const colorClass = getColorClasses(productColor);

    // Recipe mode calculations
    const hasStockReductions = product.stockReductions?.length > 0;
    const reduceOwnStock = product.reduceOwnStock !== false;
    const isRecipeMode = hasStockReductions && !reduceOwnStock;
    const isOutOfStock = isRecipeMode ? false : trackStock && stock <= 0;
    const canSell = availableForSale && !isOutOfStock;

    return {
      ...product,
      displayData: {
        trackStock,
        availableForSale,
        stock,
        imageUrl,
        colorClass,
        isRecipeMode,
        isOutOfStock,
        canSell,
      },
    };
  });
}, [
  filteredProducts,
  memoizedIsProductAvailable,
  memoizedGetProductStock,
  memoizedGetProductImage,
  memoizedGetProductColor,
]);
```

**Changes Required**:

- Modify filtering to include display data computation
- Update render logic to use pre-computed values
- Remove inline computations from JSX

### 2.3 Memoize Product Cards

**Objective**: Prevent unnecessary re-renders of product components

**Implementation**:

```jsx
const ProductCard = React.memo(({ product, onAddToCart }) => {
  const { displayData } = product;

  const handleCardClick = useCallback(() => {
    if (!displayData.canSell) return;
    onAddToCart(product);
  }, [displayData.canSell, onAddToCart, product]);

  return (
    <Card
      className={cn(
        "p-0 group overflow-hidden border bg-white dark:bg-gray-900 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md select-none touch-manipulation",
        !displayData.canSell && "cursor-not-allowed opacity-70",
      )}
      onClick={handleCardClick}
    >
      {/* Use displayData properties instead of computing inline */}
      <div className={cn("aspect-square", displayData.colorClass)}>
        {displayData.imageUrl && (
          <img
            src={displayData.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* ... rest of card content */}
    </Card>
  );
});
```

**Changes Required**:

- Extract product card to memoized component
- Use pre-computed displayData
- Add proper dependency arrays to useCallback

## Phase 3: Advanced Optimizations (Long-term)

### 3.1 Implement Virtualization

**Objective**: Handle large product catalogs efficiently

**Implementation**:

```jsx
// For products > 100, use virtualization
const ProductGrid = ({ products, onAddToCart }) => {
  if (products.length <= 100) {
    return (
      <div className="grid gap-4 grid-cols-5">
        {products.map((product) => (
          <ProductCard
            key={product.id || product.sku}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    );
  }

  // Use react-window or similar for large lists
  return (
    <FixedSizeGrid
      columnCount={5}
      rowCount={Math.ceil(products.length / 5)}
      columnWidth={200}
      rowHeight={200}
      width={1000}
      height={600}
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * 5 + columnIndex;
        const product = products[index];
        return product ? (
          <div style={style}>
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </div>
        ) : null;
      }}
    </FixedSizeGrid>
  );
};
```

### 3.2 Batch State Updates

**Objective**: Reduce cascading re-renders

**Implementation**:

```jsx
// Use useTransition for non-urgent updates
const [isPending, startTransition] = useTransition();

// Batch related state updates
const updateProductFilters = useCallback((newSearch, newCategory) => {
  startTransition(() => {
    setSearchQuery(newSearch);
    setSelectedCategory(newCategory);
  });
}, []);

// Use flushSync for urgent updates only
const addToCartUrgent = useCallback((product) => {
  flushSync(() => {
    // Immediate state updates for cart
  });
}, []);
```

### 3.3 Lazy Load Expensive Data

**Objective**: Defer non-critical data loading

**Implementation**:

```jsx
// Lazy load cashback rules only when customer is selected
const [cashbackRules, setCashbackRules] = useState([]);
const [rulesLoaded, setRulesLoaded] = useState(false);

useEffect(() => {
  if (cartCustomer && !rulesLoaded) {
    loadCashbackRules().then((rules) => {
      setCashbackRules(rules);
      setRulesLoaded(true);
    });
  }
}, [cartCustomer, rulesLoaded]);

// Lazy load categories on demand
const [categoriesLoaded, setCategoriesLoaded] = useState(false);

const loadCategoriesIfNeeded = useCallback(() => {
  if (!categoriesLoaded) {
    loadCategories().then(() => setCategoriesLoaded(true));
  }
}, [categoriesLoaded]);
```

## Implementation Timeline

### Week 1: Phase 1 (Critical Fixes)

- [ ] Convert cashback calculation to useMemo
- [ ] Implement debounced search filtering
- [ ] Test for setTimeout violation elimination

### Week 2: Phase 2 (Render Optimization)

- [ ] Memoize helper functions with caching
- [ ] Pre-compute product display data
- [ ] Memoize product card components
- [ ] Test render performance improvements

### Week 3: Phase 3 (Advanced Optimizations)

- [ ] Implement virtualization for large catalogs
- [ ] Add state update batching
- [ ] Implement lazy loading
- [ ] Final performance testing and monitoring

## Success Metrics

### Performance Targets

- **setTimeout violations**: 0 (eliminated)
- **Message handler violations**: <50ms average
- **Search responsiveness**: <100ms from last keystroke
- **Scroll performance**: 60fps maintained
- **Initial load time**: <2 seconds

### Monitoring

- Browser performance timeline analysis
- React DevTools Profiler usage
- User interaction latency measurements
- Memory usage monitoring

## Risk Mitigation

### Rollback Strategy

- Feature flags for each optimization phase
- Performance regression monitoring
- Gradual rollout with A/B testing

### Testing Requirements

- Unit tests for memoized functions
- Integration tests for debounced filtering
- Performance regression tests
- Cross-browser compatibility testing

## Dependencies

### Libraries to Consider

- `react-window` or `react-virtualized` for virtualization
- `lodash.debounce` or custom debounce implementation
- Performance monitoring tools (React DevTools Profiler)

### Team Coordination

- Frontend team for implementation
- QA team for testing
- DevOps for monitoring setup
- Product team for prioritization

## Conclusion

This comprehensive strategy addresses all identified performance bottlenecks through systematic optimization. Phase 1 focuses on eliminating the critical setTimeout violations, while subsequent phases build upon these foundations for sustained performance improvements.

The approach prioritizes user experience impact while maintaining code maintainability and follows React best practices for performance optimization.</content>
<parameter name="filePath">c:\Users\kevin\SynologyDrive\Candy Kush\pos-candy-kush\PERFORMANCE_OPTIMIZATION_STRATEGY.md
