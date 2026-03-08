import React, { useState } from 'react';
import { MessageSquare, Mail, Search, Filter, Trash2, CheckCircle, Clock, Archive, ExternalLink, User } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ContactMessage } from '../../types';

const MessagesTab: React.FC = () => {
    const {
        contactMessages,
        updateContactMessage,
        messagesLoading
    } = useData();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'replied' | 'archived'>('all');
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

    const filteredMessages = contactMessages.filter(msg => {
        const matchesSearch = msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || msg.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleStatusUpdate = async (id: string, status: ContactMessage['status']) => {
        await updateContactMessage(id, { status });
        if (selectedMessage?.id === id) {
            setSelectedMessage({ ...selectedMessage, status });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Message List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-white text-sm"
                        />
                    </div>

                    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['all', 'new', 'replied', 'archived'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${filterStatus === status
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                    {messagesLoading ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Loading messages...</div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm italic">No messages found.</div>
                    ) : (
                        filteredMessages.map((msg) => (
                            <button
                                key={msg.id}
                                onClick={() => setSelectedMessage(msg)}
                                className={`w-full text-left p-4 rounded-xl border transition-all group ${selectedMessage?.id === msg.id
                                        ? 'bg-purple-600/10 border-purple-500/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${msg.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                            msg.status === 'replied' ? 'bg-green-500/20 text-green-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {msg.status}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(msg.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-white font-medium text-sm truncate mb-1">{msg.subject}</h4>
                                <div className="flex items-center space-x-2 text-xs text-gray-400">
                                    <User className="w-3 h-3" />
                                    <span className="truncate">{msg.name}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content - Message Detail */}
            <div className="lg:col-span-2">
                {selectedMessage ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl h-full flex flex-col glass-morphism overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-white">{selectedMessage.subject}</h2>
                                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                                        <span className="flex items-center space-x-1">
                                            <User className="w-4 h-4" />
                                            <span className="text-purple-400 font-medium">{selectedMessage.name}</span>
                                        </span>
                                        <span>&bull;</span>
                                        <span className="flex items-center space-x-1">
                                            <Mail className="w-4 h-4" />
                                            <span>{selectedMessage.email}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleStatusUpdate(selectedMessage.id, 'replied')}
                                        className={`p-2 rounded-lg transition-colors ${selectedMessage.status === 'replied' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                                            }`}
                                        title="Mark as Replied"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(selectedMessage.id, 'archived')}
                                        className={`p-2 rounded-lg transition-colors ${selectedMessage.status === 'archived' ? 'bg-gray-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                                            }`}
                                        title="Archive Message"
                                    >
                                        <Archive className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 bg-white/5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Message Body */}
                        <div className="p-8 flex-1 overflow-y-auto bg-black/20">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedMessage.message}
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-6 bg-white/5 border-t border-white/10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-gray-500">
                                    Received on {new Date(selectedMessage.createdAt).toLocaleString()} via <span className="text-gray-300 font-medium">{selectedMessage.source || 'Website'}</span>
                                </div>
                                <div className="flex space-x-3 w-full md:w-auto">
                                    <a
                                        href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>Reply via Email</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-center glass-morphism">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Message Selected</h3>
                        <p className="text-gray-400 max-w-xs">
                            Select a message from the list to view its details and respond to customer inquiries.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesTab;
