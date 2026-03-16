import React, { useState, useMemo } from 'react';
import { MessageSquare, Mail, Search, Filter, Trash2, CheckCircle, Clock, Archive, ExternalLink, User, Star, MessageCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ContactMessage } from '../../types';

interface InteractionItem {
    id: string;
    type: 'message' | 'review' | 'comment';
    sender: string;
    email?: string;
    subject?: string;
    content: string;
    rating?: number;
    targetId?: string;
    targetType?: 'product' | 'mixtape';
    status: 'new' | 'replied' | 'archived' | 'pending' | 'approved' | 'published';
    createdAt: string;
}

const InteractionsTab: React.FC = () => {
    const {
        contactMessages,
        updateContactMessage,
        reviews,
        comments,
        messagesLoading,
        reviewsLoading,
        commentsLoading
    } = useData();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'message' | 'review' | 'comment'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const allInteractions: InteractionItem[] = useMemo(() => {
        const msgs: InteractionItem[] = (contactMessages || []).map(m => ({
            id: m.id,
            type: 'message',
            sender: m.name,
            email: m.email,
            subject: m.subject,
            content: m.message,
            status: m.status as any,
            createdAt: m.createdAt
        }));

        const revs: InteractionItem[] = (reviews || []).map(r => ({
            id: r.id,
            type: 'review',
            sender: r.userName || r.user_name || 'User',
            content: r.comment || r.content || '',
            rating: r.rating,
            targetId: r.target_id || r.productId || r.product_id,
            targetType: 'product',
            status: (r.status || 'approved') as any,
            createdAt: r.date || (r as any).created_at
        }));

        const comms: InteractionItem[] = (comments || []).map(c => ({
            id: c.id,
            type: 'comment',
            sender: c.userName || c.user_name || 'User',
            content: c.text || c.content || '',
            targetId: c.target_id || c.mixtapeId,
            targetType: 'mixtape',
            status: (c.status || 'approved') as any,
            createdAt: c.date || (c as any).created_at
        }));

        return [...msgs, ...revs, ...comms].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [contactMessages, reviews, comments]);

    const filteredInteractions = allInteractions.filter(item => {
        const matchesSearch = item.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.subject && item.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
            item.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    const selectedInteraction = filteredInteractions.find(i => i.id === selectedId) || null;

    const handleStatusUpdate = async (item: InteractionItem, newStatus: string) => {
        if (item.type === 'message') {
            await updateContactMessage(item.id, { status: newStatus as any });
        }
        // Logic for updating review/comment status could be added here
    };

    const getTypeIcon = (type: InteractionItem['type']) => {
        switch (type) {
            case 'message': return <Mail className="w-4 h-4" />;
            case 'review': return <Star className="w-4 h-4" />;
            case 'comment': return <MessageCircle className="w-4 h-4" />;
            default: return <MessageSquare className="w-4 h-4" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Interaction List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search interactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-white text-sm"
                        />
                    </div>

                    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['all', 'message', 'review', 'comment'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${filterType === type
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {type}s
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                    {(messagesLoading || reviewsLoading || commentsLoading) ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Loading interactions...</div>
                    ) : filteredInteractions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm italic">No interactions found.</div>
                    ) : (
                        filteredInteractions.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all group ${selectedId === item.id
                                    ? 'bg-purple-600/10 border-purple-500/30'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`p-1 rounded bg-white/5 ${item.type === 'message' ? 'text-blue-400' : item.type === 'review' ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {getTypeIcon(item.type)}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">
                                            {item.type}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-white font-medium text-sm truncate mb-1">{item.subject || item.sender}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{item.content}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content - Detail */}
            <div className="lg:col-span-2">
                {selectedInteraction ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl h-full flex flex-col glass-morphism overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedInteraction.type === 'message' ? 'bg-blue-500/10 text-blue-500' :
                                                selectedInteraction.type === 'review' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-green-500/10 text-green-500'
                                            }`}>
                                            {selectedInteraction.type}
                                        </span>
                                        {selectedInteraction.rating && (
                                            <div className="flex items-center gap-0.5 text-yellow-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < selectedInteraction.rating! ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-xl font-bold text-white">{selectedInteraction.subject || `${selectedInteraction.type} from ${selectedInteraction.sender}`}</h2>
                                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                                        <span className="flex items-center space-x-1">
                                            <User className="w-4 h-4" />
                                            <span className="text-purple-400 font-medium">{selectedInteraction.sender}</span>
                                        </span>
                                        {selectedInteraction.email && (
                                            <>
                                                <span>&bull;</span>
                                                <span className="flex items-center space-x-1">
                                                    <Mail className="w-4 h-4" />
                                                    <span>{selectedInteraction.email}</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleStatusUpdate(selectedInteraction, 'archived')}
                                        className="p-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors"
                                        title="Archive"
                                    >
                                        <Archive className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 bg-white/5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-8 flex-1 overflow-y-auto bg-black/20">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedInteraction.content}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-white/10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-500">
                                    Interaction Logged: {new Date(selectedInteraction.createdAt).toLocaleString()}
                                </div>
                                {selectedInteraction.type === 'message' && (
                                    <div className="flex space-x-3 w-full md:w-auto">
                                        <a
                                            href={`mailto:${selectedInteraction.email}?subject=Re: ${selectedInteraction.subject}`}
                                            className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span>Reply via Email</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-center glass-morphism">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Interaction Selected</h3>
                        <p className="text-gray-400 max-w-xs">
                            Select an interaction from the list to view details and manage community feedback.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InteractionsTab;
