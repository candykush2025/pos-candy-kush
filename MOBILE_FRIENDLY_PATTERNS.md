# Mobile-Friendly Patterns for Admin Pages

## ✅ COMPLETED

- **Admin Layout** - Hamburger menu, responsive sidebar, large touch targets
- **Dashboard** - Responsive grid, stacked cards, mobile-friendly spacing

## 🎨 Common Mobile Patterns to Apply

### 1. **Page Headers**

```jsx
// ❌ Before
<h1 className="text-3xl font-bold">Page Title</h1>
<p className="text-gray-500 mt-2">Description</p>

// ✅ After
<h1 className="text-2xl md:text-3xl font-bold">Page Title</h1>
<p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Description</p>
```

### 2. **Search Bars & Filters**

```jsx
// ❌ Before
<Input placeholder="Search..." className="w-64" />

// ✅ After
<Input
  placeholder="Search..."
  className="w-full md:w-64 h-12 md:h-10 text-base"
/>
```

### 3. **Button Groups**

```jsx
// ❌ Before
<div className="flex gap-2">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>

// ✅ After
<div className="flex flex-col sm:flex-row gap-2 md:gap-3">
  <Button className="h-12 md:h-10 text-base w-full sm:w-auto">Action 1</Button>
  <Button className="h-12 md:h-10 text-base w-full sm:w-auto">Action 2</Button>
</div>
```

### 4. **Data Tables → Mobile Cards**

```jsx
// ❌ Desktop-only table
<table>...</table>

// ✅ Responsive: Table on desktop, cards on mobile
<div>
  {/* Mobile: Card View */}
  <div className="md:hidden space-y-3">
    {items.map(item => (
      <Card key={item.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-base">{item.name}</h3>
          <Badge>{item.status}</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Price:</span>
            <span className="font-medium">{item.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Stock:</span>
            <span className="font-medium">{item.stock}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 h-10">Edit</Button>
          <Button size="sm" variant="outline" className="flex-1 h-10">Delete</Button>
        </div>
      </Card>
    ))}
  </div>

  {/* Desktop: Table View */}
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full">...</table>
  </div>
</div>
```

### 5. **Grid Layouts**

```jsx
// ❌ Before
<div className="grid grid-cols-4 gap-6">

// ✅ After
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
```

### 6. **Modal/Dialog Content**

```jsx
// ❌ Before
<DialogContent>
  <Input />
  <Button>Submit</Button>
</DialogContent>

// ✅ After
<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
  <Input className="h-12 md:h-10 text-base" />
  <Button className="h-12 md:h-10 text-base w-full">Submit</Button>
</DialogContent>
```

### 7. **Action Buttons**

```jsx
// ❌ Before
<Button size="sm">
  <Plus className="h-4 w-4 mr-2" />
  Add New
</Button>

// ✅ After
<Button size="sm" className="h-12 md:h-10 text-base">
  <Plus className="h-5 w-5 md:h-4 md:w-4 mr-2" />
  <span className="hidden sm:inline">Add New</span>
  <span className="sm:hidden">Add</span>
</Button>
```

### 8. **Spacing**

```jsx
// ❌ Before
<div className="space-y-8">
<div className="p-8">
<div className="gap-6">

// ✅ After
<div className="space-y-4 md:space-y-6 lg:space-y-8">
<div className="p-4 md:p-6 lg:p-8">
<div className="gap-3 md:gap-4 lg:gap-6">
```

### 9. **Text Sizes**

```jsx
// ❌ Before
<p className="text-sm">Info text</p>
<h3 className="text-xl">Heading</h3>

// ✅ After
<p className="text-base md:text-sm">Info text</p>
<h3 className="text-lg md:text-xl">Heading</h3>
```

### 10. **Touch-Friendly Icons**

```jsx
// ❌ Before
<Edit className="h-4 w-4" />

// ✅ After
<Edit className="h-5 w-5 md:h-4 md:w-4" />
```

## 📋 Page-Specific Updates Needed

### Products (Item List)

- [ ] Convert table to cards on mobile
- [ ] Make filters collapsible
- [ ] Larger action buttons
- [ ] Stack form fields vertically

### Categories

- [ ] Responsive grid (1 → 2 → 3 cols)
- [ ] Larger color picker on mobile
- [ ] Full-width buttons on mobile

### Stock

- [ ] Convert table to expandable cards
- [ ] Mobile-friendly sync button
- [ ] Stack inventory levels vertically

### Orders

- [ ] Card view for mobile
- [ ] Collapsible filters
- [ ] Touch-friendly pagination
- [ ] Receipt modal scrollable

### Customers

- [ ] Card view with avatars
- [ ] Touch-friendly edit/delete
- [ ] Mobile-optimized detail view
- [ ] Stacked form fields

### Users

- [ ] Card-based user list
- [ ] Full-width form fields
- [ ] Larger role badges
- [ ] Mobile-friendly PIN input

### Analytics

- [ ] Stack charts vertically
- [ ] Responsive date picker
- [ ] Mobile-friendly legends
- [ ] Touch-friendly filters

### Integration

- [ ] Stack sync sections
- [ ] Larger sync buttons (h-14)
- [ ] Mobile-optimized JSON viewer
- [ ] Full-width action buttons

### Settings

- [ ] Stack form sections
- [ ] Larger color pickers
- [ ] Full-width inputs
- [ ] Touch-friendly switches

## 🎯 Touch Target Guidelines

- Minimum button height: **48px (h-12)** on mobile
- Icon size: **20px (h-5 w-5)** on mobile, 16px on desktop
- Input height: **48px (h-12)** on mobile
- Text: **16px (text-base)** minimum on mobile for readability
- Spacing: **12-16px gap** between interactive elements

## 📱 Breakpoints

- `sm`: 640px - Small phones in landscape
- `md`: 768px - Tablets
- `lg`: 1024px - Small laptops
- `xl`: 1280px - Desktop

## ✨ Best Practices

1. **Always test on actual mobile device** (320px - 428px width)
2. **Use overflow-x-auto** for tables that can't be cards
3. **Hide non-essential text** on mobile with `hidden sm:inline`
4. **Stack vertically first**, horizontal on larger screens
5. **Make all clickable areas** at least 44x44px
6. **Use active:scale-95** for tactile feedback on touch
