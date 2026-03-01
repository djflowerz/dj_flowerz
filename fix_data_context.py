import re

with open('context/DataContext.tsx', 'r') as f:
    content = f.read()

# Make SUPABASE_COLLECTIONS empty
content = re.sub(
    r"const SUPABASE_COLLECTIONS = \[[^\]]+\];",
    "const SUPABASE_COLLECTIONS: string[] = [];",
    content
)

# Fix map functions
content = content.replace(
    "const mappedProduct = mapSupabaseProduct(product);",
    ""
)

# Product Methods
add_product_replacement = """  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const docId = `prod_${Date.now()}`;
      const newProduct = { ...product, id: docId, createdAt: new Date().toISOString() };
      const newProducts = [newProduct, ...products];
      await saveToR2('products', newProducts);
      refreshProducts();
    } catch (err: any) {
      console.error("Add product failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addProduct = async \(product: Omit<Product, 'id'>\) => \{[\s\S]*?refreshProducts\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Add product failed:\", err\.message\);\n    \}\n  \};",
    add_product_replacement,
    content
)

update_product_replacement = """  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const newProducts = products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      await saveToR2('products', newProducts);
      refreshProducts();
    } catch (err: any) {
      console.error("Update product failed:", err.message);
    }
  };"""

content = re.sub(
    r"const updateProduct = async \(id: string, data: Partial<Product>\) => \{[\s\S]*?refreshProducts\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Update product failed:\", err\.message\);\n    \}\n  \};",
    update_product_replacement,
    content
)

delete_product_replacement = """  const deleteProduct = async (id: string) => {
    try {
      const newProducts = products.filter(p => p.id !== id);
      await saveToR2('products', newProducts);
      refreshProducts();
    } catch (err: any) {
      console.error("Delete product failed:", err.message);
    }
  };"""

content = re.sub(
    r"const deleteProduct = async \(id: string\) => \{[\s\S]*?refreshProducts\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Delete product failed:\", err\.message\);\n    \}\n  \};",
    delete_product_replacement,
    content
)

# Contact Messages
add_message_replacement = """  const addContactMessage = async (message: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => {
    try {
      const docId = `msg_${Date.now()}`;
      const newMessage: ContactMessage = {
        ...message,
        id: docId,
        status: 'new',
        createdAt: new Date().toISOString(),
      };
      const newMessages = [newMessage, ...contactMessages];
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Add contact message failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addContactMessage = async \(message: Omit<ContactMessage, 'id' \| 'createdAt' \| 'status'>\) => \{[\s\S]*?refreshContactMessages\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Add contact message failed:\", err\.message\);\n    \}\n  \};",
    add_message_replacement,
    content
)

update_message_replacement = """  const updateContactMessage = async (id: string, updates: Partial<ContactMessage>) => {
    try {
      const newMessages = contactMessages.map(m => m.id === id ? { ...m, ...updates } : m);
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Update contact message failed:", err.message);
    }
  };"""

content = re.sub(
    r"const updateContactMessage = async \(id: string, updates: Partial<ContactMessage>\) => \{[\s\S]*?refreshContactMessages\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Update contact message failed:\", err\.message\);\n    \}\n  \};",
    update_message_replacement,
    content
)

# Coupons
add_coupon_replacement = """  const addCoupon = async (coupon: Coupon) => {
    try {
      const docId = coupon.id || `cpn_${Date.now()}`;
      const newCoupons = [{ ...coupon, id: docId, updatedAt: new Date().toISOString() }, ...coupons];
      await saveToR2('coupons', newCoupons);
      refreshCoupons();
    } catch (err: any) {
      console.error("Add coupon failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addCoupon = async \(coupon: Coupon\) => \{[\s\S]*?refreshCoupons\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Add coupon failed:\", err\.message\);\n    \}\n  \};",
    add_coupon_replacement,
    content
)

update_coupon_replacement = """  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    try {
      const newCoupons = coupons.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      await saveToR2('coupons', newCoupons);
      refreshCoupons();
    } catch (err: any) {
      console.error("Update coupon failed:", err.message);
    }
  };"""

content = re.sub(
    r"const updateCoupon = async \(id: string, data: Partial<Coupon>\) => \{[\s\S]*?refreshCoupons\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Update coupon failed:\", err\.message\);\n    \}\n  \};",
    update_coupon_replacement,
    content
)

# Mixtape Downs
mixtape_download_replacement = """  const logMixtapeDownload = async (mixtapeId: string) => {
    try {
        const docId = `dl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        // For local R2, we don't fetch/upate a whole log file. We simply increment view count.
        const newMixtapes = mixtapes.map(m => m.id === mixtapeId ? { ...m, downloadCount: (m.downloadCount || 0) + 1 } : m);
        await saveToR2('mixtapes', newMixtapes);
        refreshMixtapes();
    } catch (err: any) {
      console.error("Log download failed:", err.message);
    }
  };"""
content = re.sub(
    r"const logMixtapeDownload = async \(mixtapeId: string\) => \{[\s\S]*?console\.error\(\"Log download failed:\", err\.message\);\n    \}\n  \};",
    mixtape_download_replacement,
    content
)

# Reviews & Comments
add_review_replacement = """  const addReview = async (productId: string, rating: number, text: string) => {
    try {
      if (!user) throw new Error('Must be logged in to review');
      const docId = `rev_${Date.now()}`;
      const newReview = { id: docId, productId, userId: user.id, userName: user.name, rating, text, createdAt: new Date().toISOString(), status: 'pending' };
      const newReviews = [newReview, ...reviews];
      await saveToR2('reviews', newReviews);
      refreshReviews();
    } catch (err: any) {
      console.error("Add review failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addReview = async \(productId: string, rating: number, text: string\) => \{[\s\S]*?refreshReviews\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Add review failed:\", err\.message\);\n    \}\n  \};",
    add_review_replacement,
    content
)

add_comment_replacement = """  const addComment = async (mixtapeId: string, text: string) => {
    try {
      if (!user) throw new Error('Must be logged in to comment');
      const docId = `com_${Date.now()}`;
      const newComment = { id: docId, mixtapeId, userId: user.id, userName: user.name, text, createdAt: new Date().toISOString(), status: 'pending' };
      const newComments = [newComment, ...comments];
      await saveToR2('comments', newComments);
      refreshComments();
    } catch (err: any) {
      console.error("Add comment failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addComment = async \(mixtapeId: string, text: string\) => \{[\s\S]*?refreshComments\(\);\n    \} catch \(err: any\) \{[\s\S]*?console\.error\(\"Add comment failed:\", err\.message\);\n    \}\n  \};",
    add_comment_replacement,
    content
)

# Scanned Tracks
add_scanned_replacement = """  const addScannedTracks = async (tracks: any[]) => {
    try {
      const capped = tracks.slice(0, 100);
      const newTracks = [...capped, ...scannedTracks];
      await saveToR2('scanned_tracks', newTracks);
      // Wait to merge locally
    } catch (err: any) {
      console.error("Add scanned tracks failed:", err.message);
    }
  };"""

content = re.sub(
    r"const addScannedTracks = async \(tracks: any\[\]\) => \{[\s\S]*?console\.error\(\"Add scanned tracks failed:\", err\.message\);\n    \}\n  \};",
    add_scanned_replacement,
    content
)


with open('context/DataContext.tsx', 'w') as f:
    f.write(content)

print("Modifications written successfully to DataContext.tsx")
