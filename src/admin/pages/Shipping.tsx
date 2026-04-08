import React, { useState, useEffect } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, AlertCircle, Edit, MapPin, User, Phone, ExternalLink } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  shipping_status: string;
  tracking_number: string;
  courier_name: string;
  courier_driver_name: string;
  courier_driver_contact: string;
  estimated_arrival: string;
  shipping_address: string;
  created_at: string;
}

const Shipping = () => {
  const { request, loading: apiLoading } = useAdminApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await request('/api/admin/orders');
      if (data) {
        setOrders(Array.isArray(data) ? data : (data.orders || []));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipping = async (orderId: string, updates: any) => {
    try {
      await request(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      setEditingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating shipping:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (order.tracking_number && order.tracking_number.toLowerCase().includes(search.toLowerCase()));
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && order.shipping_status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shipped': return 'text-blue-500 bg-blue-500/10';
      case 'out_for_delivery': return 'text-orange-500 bg-orange-500/10';
      case 'delivered': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <AdminLayout title="Shipping Management">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#15151A] p-4 rounded-xl border border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search by order #, name, or tracking..."
              className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-brand-purple"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'shipped', 'out_for_delivery', 'delivered'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-brand-purple text-white' : 'bg-black/50 text-gray-400 hover:text-white border border-white/5'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div></div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-[#15151A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-500">#{order.order_number}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.shipping_status)}`}>
                          {order.shipping_status || 'Pending'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={18} className="text-brand-purple" />
                        {order.customer_name}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-2"><MapPin size={14} /> {order.shipping_address || 'No address provided'}</span>
                        <span className="flex items-center gap-2"><Clock size={14} /> {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4">
                      <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase font-black block">Driver Info</span>
                        <p className="text-white font-medium text-sm flex items-center gap-2">
                          <Truck size={14} className="text-brand-purple" />
                          {order.courier_driver_name || 'Not assigned'}
                        </p>
                        {order.courier_driver_contact && (
                          <p className="text-gray-400 text-xs flex items-center gap-2">
                            <Phone size={12} /> {order.courier_driver_contact}
                          </p>
                        )}
                      </div>

                      <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase font-black block">Tracking</span>
                        <p className="text-white font-medium text-sm">{order.tracking_number || 'N/A'}</p>
                        <p className="text-gray-400 text-xs">{order.courier_name || 'Standard Shipping'}</p>
                      </div>

                      <button 
                        onClick={() => setEditingOrder(order)}
                        className="p-4 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-xl hover:bg-brand-purple/20 transition flex items-center justify-center"
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-24 bg-[#15151A] rounded-2xl border border-dashed border-white/10">
              <Package size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
              <p className="text-gray-500">No orders found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#15151A] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Update Shipping Info</h2>
              <button onClick={() => setEditingOrder(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateShipping(editingOrder.id, {
                shipping_status: formData.get('status'),
                tracking_number: formData.get('tracking'),
                courier_name: formData.get('courier'),
                courier_driver_name: formData.get('driver'),
                courier_driver_contact: formData.get('contact'),
                estimated_arrival: formData.get('arrival')
              });
            }}>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Status</label>
                <select name="status" defaultValue={editingOrder.shipping_status || 'pending'} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple">
                  <option value="pending">Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Tracking #</label>
                  <input name="tracking" defaultValue={editingOrder.tracking_number} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Courier</label>
                  <input name="courier" defaultValue={editingOrder.courier_name} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Driver Name</label>
                  <input name="driver" defaultValue={editingOrder.courier_driver_name} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Driver Contact</label>
                  <input name="contact" defaultValue={editingOrder.courier_driver_contact} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Est. Arrival</label>
                <input type="date" name="arrival" defaultValue={editingOrder.estimated_arrival?.split('T')[0]} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple" />
              </div>

              <button type="submit" className="w-full bg-brand-purple py-4 rounded-xl font-bold text-white hover:bg-brand-purple-dark transition shadow-lg shadow-brand-purple/20">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Shipping;
