import re

with open('context/DataContext.tsx', 'r') as f:
    lines = f.readlines()

def replace_function(lines, func_name, new_body):
    start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith(f"const {func_name} ="):
            start = i
            break
            
    if start == -1: return lines
    
    # find end (count braces)
    brace_count = 0
    end = -1
    for i in range(start, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        if brace_count == 0 and ';' in lines[i]:
            end = i
            break
    
    if end != -1:
        return lines[:start] + [new_body + "\n"] + lines[end+1:]
    return lines

# Replacements:
# Products
p_add = """  const addProduct = async (product: Omit<Product, 'id'>) => {
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

p_update = """  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const newProducts = products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      await saveToR2('products', newProducts);
      refreshProducts();
    } catch (err: any) {
      console.error("Update product failed:", err.message);
    }
  };"""

p_del = """  const deleteProduct = async (id: string) => {
    try {
      const newProducts = products.filter(p => p.id !== id);
      await saveToR2('products', newProducts);
      refreshProducts();
    } catch (err: any) {
      console.error("Delete product failed:", err.message);
    }
  };"""

# Tracks
t_add = """  const addScannedTracks = async (tracks: any[]) => {
    try {
      const newTracks = [...tracks.slice(0, 100), ...(scannedTracks || [])];
      await saveToR2('scanned_tracks', newTracks);
      refreshScannedTracks();
    } catch (err: any) {
      console.error("Add scanned tracks failed:", err.message);
    }
  };"""

# Contact messages
msg_add = """  const addContactMessage = async (message: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => {
    try {
      const docId = `msg_${Date.now()}`;
      const newMessage: ContactMessage = {
        ...message,
        id: docId,
        status: 'new',
        createdAt: new Date().toISOString(),
      };
      const newMessages = [newMessage, ...(contactMessages || [])];
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Add contact message failed:", err.message);
    }
  };"""

msg_update = """  const updateContactMessage = async (id: string, updates: Partial<ContactMessage>) => {
    try {
      const newMessages = (contactMessages || []).map(m => m.id === id ? { ...m, ...updates } : m);
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Update contact message failed:", err.message);
    }
  };"""
  
# Reviews & Comments
rev_add = """  const addReview = async (productId: string, rating: number, text: string) => {
    try {
      if (!user) throw new Error('Must be logged in to review');
      const docId = `rev_${Date.now()}`;
      const newReview = { id: docId, productId, userId: user.id, userName: user.name || 'User', rating, text, createdAt: new Date().toISOString(), status: 'pending' };
      const newReviews = [newReview, ...(reviews || [])];
      await saveToR2('reviews', newReviews);
      refreshReviews();
    } catch (err: any) {
      console.error("Add review failed:", err.message);
    }
  };"""

com_add = """  const addComment = async (mixtapeId: string, text: string) => {
    try {
      if (!user) throw new Error('Must be logged in to comment');
      const docId = `com_${Date.now()}`;
      const newComment = { id: docId, mixtapeId, userId: user.id, userName: user.name || 'User', text, createdAt: new Date().toISOString(), status: 'pending' };
      const newComments = [newComment, ...(comments || [])];
      await saveToR2('comments', newComments);
      refreshComments();
    } catch (err: any) {
      console.error("Add comment failed:", err.message);
    }
  };"""

dl_log = """  const logMixtapeDownload = async (mixtapeId: string) => {
    try {
        const newMixtapes = (mixtapes || []).map(m => m.id === mixtapeId ? { ...m, downloadCount: (m.downloadCount || 0) + 1 } : m);
        await saveToR2('mixtapes', newMixtapes);
        refreshMixtapes();
    } catch (err: any) {
      console.error("Log download failed:", err.message);
    }
  };"""

lines = replace_function(lines, "addProduct", p_add)
lines = replace_function(lines, "updateProduct", p_update)
lines = replace_function(lines, "deleteProduct", p_del)
lines = replace_function(lines, "addScannedTracks", t_add)
lines = replace_function(lines, "addContactMessage", msg_add)
lines = replace_function(lines, "updateContactMessage", msg_update)
lines = replace_function(lines, "addReview", rev_add)
lines = replace_function(lines, "addComment", com_add)
lines = replace_function(lines, "logMixtapeDownload", dl_log)

with open('context/DataContext.tsx', 'w') as f:
    f.writelines(lines)
print("Updated via brace matching.")
