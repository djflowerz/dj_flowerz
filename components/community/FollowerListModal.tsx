import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../user/UserAvatar';
import { TrustBadge } from './TrustBadge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface FollowerListModalProps {
  userId: string;
  userName: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
}

interface FollowerUser {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  aura_tier: string;
  is_following: boolean;
}

export const FollowerListModal: React.FC<FollowerListModalProps> = ({
  userId,
  userName,
  type,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/profiles/${userId}/${type}`);
      const data = await resp.json();
      if (data.results) {
        setUsers(data.results);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId: string) => {
    if (!currentUser) {
      toast.error('Please login to follow');
      return;
    }
    
    try {
      const resp = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: targetId })
      });
      const data = await resp.json();
      if (data.success) {
        setUsers(prev => prev.map(u => 
          u.id === targetId ? { ...u, is_following: data.followed } : u
        ));
        toast.success(data.followed ? 'Following' : 'Unfollowed');
      }
    } catch (err) {
      toast.error('Connection failed');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.handle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0B0B0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  {type === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{userName}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-white/5 bg-white/[0.01]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="text"
                  placeholder="Search list..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[300px]">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
                  <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Gathering community...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map(u => (
                    <div 
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-all group"
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer overflow-hidden"
                        onClick={() => { onClose(); navigate(`/member/${u.handle}`); }}
                      >
                        <UserAvatar src={u.avatar_url} name={u.full_name} size={10} className="ring-brand-purple/20 group-hover:ring-brand-purple/50 transition-all" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">{u.full_name}</span>
                            <TrustBadge type={u.aura_tier?.toLowerCase() as any} size="xs" showLabel={false} />
                          </div>
                          <p className="text-[10px] text-white/40 font-medium tracking-tight">@{u.handle}</p>
                        </div>
                      </div>

                      {currentUser?.id !== u.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFollowToggle(u.id); }}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            u.is_following
                              ? 'bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-500 border border-white/10 hover:border-red-500/20'
                              : 'bg-brand-purple text-white shadow-[0_5px_15px_rgba(163,73,245,0.3)] hover:shadow-[0_8px_20px_rgba(163,73,245,0.4)] hover:-translate-y-0.5'
                          }`}
                        >
                          {u.is_following ? 'Unfollow' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/10">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Users size={32} strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest mb-1">
                      {searchTerm ? 'No results found' : 'Nothing to see here'}
                    </span>
                    <p className="text-[9px] font-medium text-white/20 uppercase tracking-widest">
                      {searchTerm ? 'Try a different search term' : 'This list is currently empty'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-center gap-2">
               <AlertCircle size={10} className="text-white/20" />
               <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Community Trust Network</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
