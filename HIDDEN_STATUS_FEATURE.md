# Hidden Product Status Feature

## Overview
Added a new product status "hidden" which allows products to be hidden from the user-facing store and home pages while still being manageable in the admin dashboard.

## Changes Made

### 1. Product Interface Update
**Location**: `types.ts`
- Updated `status` field to include `'hidden'`:
```typescript
status: 'draft' | 'published' | 'hidden';
```

### 2. Admin Dashboard Updates
**Location**: `pages/AdminDashboard.tsx`

**Product Form:**
- Added 'hidden' to the status dropdown options.

**Product List:**
- Updated the status badge to support 'hidden' status with a specific color (yellow/orange):
```typescript
p.status === 'hidden' ? 'bg-yellow-500/10 text-yellow-500'
```

### 3. User-Facing Page Updates

**Store Page (`pages/Store.tsx`):**
- Filtered out products with `status === 'hidden'` from the product grid.
```typescript
if (product.status === 'hidden') return false;
```

**Home Page (`pages/Home.tsx`):**
- Filtered out products with `status === 'hidden'` from the "Featured Products" section.
```typescript
.filter(p => p.status !== 'hidden')
```

**Product Details Page (`pages/ProductDetails.tsx`):**
- Added a check to show "Product Not Found" if a user tries to access a hidden product directly via URL.
- Fixed a bug where `products[0]` was used as a fallback, which could show the wrong product.

## Behavior

1.  **Admin**: You can now set a product status to "hidden". It will appear in the admin list with a yellow badge.
2.  **Store**: Hidden products will NOT appear in the store listing or search results.
3.  **Home**: Hidden products will NOT appear in the "Featured Products" section.
4.  **Details Page**: If a user has a direct link to a hidden product, they will see a "Product Not Found" message.

## Date Implemented
February 12, 2026
