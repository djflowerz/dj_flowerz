import { useState } from 'react';
import { Order } from '../../types';
import { Package, MessageCircle, Truck, Search, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function AdminOrdersTab() {
  const { orders, updateOrder } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'fulfillment' | 'whatsapp'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateOrder(id, { status: status as any });
    } catch (err) {
      console.error(err);
    }
  };

  const updateTracking = async (id: string, trackingNumber: string) => {
    try {
      await updateOrder(id, { tracking_number: trackingNumber } as any);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsShipped = async (id: string, trackingNumber: string) => {
    if (!trackingNumber) {
      alert('Please enter a tracking number first.');
      return;
    }
    await updateTracking(id, trackingNumber);
    await updateStatus(id, 'shipped');
  };

  const processRefund = async (id: string) => {
    if (confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      try {
        await updateOrder(id, { refund_status: 'processed' } as any);
        alert('Refund processed successfully');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const custName = (order as any).customer_name || order.customerName || '';
    const custEmail = (order as any).customer_email || order.customerEmail || '';

    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    if (activeTab === 'fulfillment') {
      const pStatus = (order as any).payment_status || order.paymentStatus;
      return matchesSearch && (order.status === 'processing' || pStatus === 'paid');
    }
    if (activeTab === 'whatsapp') {
      const pMethod = (order as any).payment_method || (order as any).paymentMethod;
      return matchesSearch && (pMethod === 'WhatsApp' || (order as any).notes?.includes('WhatsApp'));
    }
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            All Orders
          </button>
          <button
            onClick={() => setActiveTab('fulfillment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fulfillment' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            <Package size={16} />
            Fulfillment
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {activeTab === 'all' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'fulfillment' ? 'Fulfillment Action' : 'Date'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-indigo-600">#{order.id.slice(0, 8)}</div>
                    {order.payment_method === 'WhatsApp' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                        WhatsApp
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                      }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.refund_status === 'processed' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Refunded
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activeTab === 'fulfillment' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Tracking Number"
                          defaultValue={order.tracking_number}
                          onBlur={(e) => updateTracking(order.id, e.target.value)}
                          className="text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 w-32"
                        />
                        <button
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                            markAsShipped(order.id, input.value);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Mark as Shipped"
                        >
                          <Truck size={16} />
                        </button>
                      </div>
                    ) : (
                      new Date(order.created_at).toLocaleDateString()
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {order.status !== 'cancelled' && order.refund_status !== 'processed' && (
                        <button
                          onClick={() => processRefund(order.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded"
                          title="Refund Order"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
