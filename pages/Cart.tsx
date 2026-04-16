import React from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Trash2, ArrowRight, ShoppingBag, Minus, Plus } from 'lucide-react';

export default function Cart() {
  const { items, removeFromCart, cartTotal, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="bg-[#0B0B0F] min-h-screen flex flex-col items-center justify-center px-4 pt-20">
        <div className="bg-[#15151A] p-12 rounded-[2.5rem] border border-white/5 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-purple border border-brand-purple/20">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 font-medium">Looks like you haven't added any professional gear to your setup yet.</p>
          <Link to="/store" className="inline-flex items-center justify-center w-full bg-brand-purple px-8 py-4 rounded-2xl text-white font-black hover:bg-purple-600 transition-all shadow-xl shadow-brand-purple/20 uppercase tracking-widest">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0F] min-h-screen py-24 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-brand-purple/10 rounded-2xl border border-brand-purple/20 text-brand-purple">
            <ShoppingBag size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Shopping Cart</h1>
            <p className="text-gray-500 font-medium">You have {items.length} items in your equipment list</p>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          <section className="lg:col-span-7">
            <ul role="list" className="space-y-6">
              {items.map((product) => (
                <li key={product.id} className="flex p-6 bg-[#15151A] rounded-[2rem] border border-white/5 shadow-xl group">
                  {/* Product Image */}
                  <div className="flex-shrink-0 relative overflow-hidden rounded-2xl border border-white/10 w-24 h-24 sm:w-32 sm:h-32 bg-[#0B0B0F]">
                    {product.image || product.image_url ? (
                      <img loading="lazy" src={product.image || product.image_url}
                        alt={product.name}
                        className="w-full h-full object-center object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <ShoppingBag size={28} />
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="pr-10">
                        <Link to={`/store/${product.slug || product.id}`} className="text-xl font-bold text-white hover:text-brand-purple transition-colors tracking-tight">
                          {product.name}
                        </Link>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">{product.category}</p>
                        <p className="mt-2 text-xl font-black text-brand-cyan">KES {product.price.toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Remove Item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* +/- Quantity Control */}
                      <div className="flex items-center bg-[#0B0B0F] rounded-xl border border-white/10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, Math.max(1, product.quantity - 1))}
                          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                          disabled={product.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-white">{product.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, product.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">Total</p>
                        <p className="font-black text-white">KES {(product.price * product.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-16 lg:mt-0 lg:col-span-5 sticky top-28">
            <div className="bg-[#15151A] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl space-y-8">
              <h2 className="text-xl font-black tracking-tight uppercase">Order Summary</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Subtotal</span>
                  <span className="text-lg font-bold text-gray-400">KES {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Shipping</span>
                  <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest bg-brand-purple/10 px-3 py-1 rounded-full border border-brand-purple/20">Calculated at Checkout</span>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between px-6 py-6 bg-brand-purple/10 rounded-[2rem] border border-brand-purple/20 shadow-inner">
                    <span className="text-sm font-black text-white uppercase tracking-widest leading-none">Grand Total</span>
                    <span className="text-3xl font-black text-white tracking-tighter leading-none">KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  to="/checkout"
                  className="w-full flex items-center justify-center bg-brand-purple hover:bg-purple-600 text-white rounded-[2rem] py-6 text-xl font-black shadow-2xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em]"
                >
                  Proceed to Checkout <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
                <Link
                  to="/store"
                  className="w-full flex items-center justify-center bg-transparent border border-white/10 hover:border-white/30 text-gray-400 hover:text-white rounded-[2rem] py-4 text-xs font-black transition-all uppercase tracking-widest"
                >
                  Continue Shopping
                </Link>
              </div>

              <div className="pt-4 flex items-center justify-center gap-6 opacity-30">
                <div className="h-6 w-10 bg-white/20 rounded"></div>
                <div className="h-6 w-10 bg-white/20 rounded"></div>
                <div className="h-6 w-10 bg-white/20 rounded"></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
