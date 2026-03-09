import React, { useState } from 'react';
import { Product } from '../../types';
import { Plus } from 'lucide-react';
import ProductTable from './ProductTable';
import AddProductForm from './AddProductForm';
import { useData } from '../../context/DataContext';

export default function AdminProductsTab() {
  const { products, addProduct, updateProduct, deleteProduct, productsLoading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
    }
  };

  const handleSave = async (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());

    const productData: Partial<Product> = {
      name: data.name as string,
      description: data.description as string,
      price: parseFloat(data.price as string),
      category: data.category as string,
      stock: parseInt(data.stock as string),
      sku: data.sku as string,
      weight: data.weight ? (data.weight as string) : undefined,
      dimensions: data.dimensions as string,
      compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice as string) : undefined,
      isActive: data.isActive === 'on',
      isFeatured: data.isFeatured === 'on',
      isFree: data.isFree === 'on',
      whatsappEnabled: data.whatsappEnabled === 'on'
    };

    if (editingProduct && editingProduct.image) {
      productData.image = editingProduct.image;
    }

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData as Omit<Product, 'id'>);
    }

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (productsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight">Products</h3>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage store inventory and catalogue</p>
        </div>
        {!isModalOpen && (
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-brand-purple hover:bg-purple-600 text-white px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(123,92,255,0.3)] hover:shadow-[0_0_30px_rgba(123,92,255,0.5)]"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {isModalOpen ? (
        <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden">
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <AddProductForm
            onSave={handleSave}
            initialData={editingProduct}
            onCancel={() => { setIsModalOpen(false); setEditingProduct(null); }}
          />
        </div>
      ) : (
        <ProductTable
          products={products}
          onEdit={(product) => { setEditingProduct(product); setIsModalOpen(true); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
