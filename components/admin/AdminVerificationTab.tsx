
import React, { useState, useEffect } from 'react';
import { Check, X, Shield, User, Clock, AlertTriangle, Search, Info, Fingerprint, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { STORAGE_WORKER_URL, getAuthHeader } from '../../utils/r2';

interface VerificationRequest {
  id: string;
  handle: string;
  full_name: string;
  email: string;
  avatar_url: string;
  status: 'requested' | 'approved' | 'rejected' | 'verified';
  requested_at: string;
  aura_tier: string;
  bio?: string;
}

const AdminVerificationTab: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/trust/verification-queue`, {
        headers: await getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      setRequests(data.items || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/verify/${id}`, {
        method: 'POST',
        headers: {
          ...await getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (!res.ok) throw new Error(`Failed to ${action} request`);
      
      const result = await res.json();
      toast.success(action === 'approve' 
        ? `Request approved. OTP: ${result.otp_code}` 
        : 'Request rejected');
      
      fetchQueue();
    } catch (error) {
      toast.error(`Action failed: ${action}`);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            <Fingerprint className="text-brand-purple" size={36} />
            AURA IDENTITY
          </h2>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-2 pl-1">
            Verification Governance & Identity Management
          </p>
        </div>

        <div className="relative group w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by handle or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0B0F] border border-white/5 rounded-3xl py-4 pl-14 pr-6 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-700 shadow-inner"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Identity Records...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 p-20 text-center flex flex-col items-center shadow-inner">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-gray-700 mb-6">
            <Shield size={48} />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Queue Clear</h3>
          <p className="text-gray-600 text-sm mt-2 font-medium">No pending Aura Identity verification requests found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden group hover:border-white/10 transition-all duration-500 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-purple/10 transition-all duration-700" />
              
              <div className="relative">
                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-white/5 group-hover:border-brand-purple/30 transition-all duration-500 shadow-2xl">
                  <img src={req.avatar_url || 'https://via.placeholder.com/150'} alt={req.handle} className="w-full h-full object-cover" />
                </div>
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-brand-purple flex items-center justify-center text-white shadow-lg shadow-brand-purple/40 border-2 border-[#0B0B0F]`}>
                  <Zap size={20} />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{req.full_name}</h3>
                    <div className="flex items-center gap-2 text-brand-purple text-[10px] font-black tracking-widest uppercase">
                      @{req.handle}
                      <span className="w-1 h-1 bg-gray-800 rounded-full" />
                      {req.aura_tier} Tier
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-brand-purple/10 text-brand-purple rounded-full text-[9px] font-black uppercase tracking-wider border border-brand-purple/20">
                    PENDING
                  </div>
                </div>

                <div className="space-y-3 bg-black/40 rounded-3xl p-6 border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <Clock size={14} className="text-gray-600" />
                    Requested: {new Date(req.requested_at).toLocaleDateString()}
                  </div>
                  {req.bio && (
                    <p className="text-xs text-gray-500 leading-relaxed italic line-clamp-2">
                      "{req.bio}"
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => handleAction(req.id, 'approve')}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-brand-cyan hover:text-black transition-all shadow-lg"
                  >
                    <Check size={16} />
                    Approve Identity
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="w-20 h-20 rounded-[2rem] bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20 shrink-0 shadow-inner">
          <Info size={32} />
        </div>
        <div className="space-y-2 relative z-10">
          <h4 className="text-xl font-black text-white tracking-tighter uppercase">Governance Protocol</h4>
          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl font-medium">
            Verification is the backbone of the Nocturnal Pulse trust economy. Ensure you cross-reference handles with known social media footprints before approval. Approved users will receive a one-time activation code via their registered secure channel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminVerificationTab;
