import React, { useState } from 'react';
import { Mail, Send, Users, History, Filter, Search, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { NewsletterSubscriber, NewsletterCampaign } from '../../types';

const NewsletterTab: React.FC = () => {
    const {
        subscribers,
        newsletterCampaigns,
        broadcastEmail,
        refreshSubscribers,
        refreshCampaigns,
        subscribersLoading,
        campaignsLoading
    } = useData();

    const [activeSubTab, setActiveSubTab] = useState<'subscribers' | 'compose' | 'history'>('subscribers');
    const [searchTerm, setSearchTerm] = useState('');
    const [composeData, setComposeData] = useState({
        subject: '',
        body: '',
        segment: 'all'
    });
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const filteredSubscribers = subscribers.filter(s =>
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!composeData.subject || !composeData.body) {
            setStatusMessage({ type: 'error', text: 'Subject and body are required.' });
            return;
        }

        if (!confirm('Are you sure you want to send this broadcast to all selected recipients?')) return;

        setIsSending(true);
        setStatusMessage(null);

        try {
            const result = await broadcastEmail(composeData);
            if (result.success) {
                setStatusMessage({ type: 'success', text: `Broadcast sent successfully to ${result.recipientCount || 'all'} subscribers!` });
                setComposeData({ subject: '', body: '', segment: 'all' });
                setActiveSubTab('history');
            } else {
                setStatusMessage({ type: 'error', text: result.message || 'Failed to send broadcast.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-white/10 pb-4">
                {[
                    { id: 'subscribers', label: 'Subscribers', icon: Users },
                    { id: 'compose', label: 'Compose Broadcast', icon: Send },
                    { id: 'history', label: 'Campaign History', icon: History }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${activeSubTab === tab.id
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {statusMessage && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 ${statusMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {activeSubTab === 'subscribers' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search subscribers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                            />
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{subscribers.length} Total Subscribers</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass-morphism">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Email</th>
                                    <th className="px-6 py-4 font-medium">Date Joined</th>
                                    <th className="px-6 py-4 font-medium">Source</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {subscribersLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading subscribers...</td>
                                    </tr>
                                ) : filteredSubscribers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No subscribers found.</td>
                                    </tr>
                                ) : (
                                    filteredSubscribers.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                                                        {sub.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium">{sub.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {sub.dateSubscribed ? new Date(sub.dateSubscribed).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                                                    {sub.source || 'newsletter'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs border ${sub.status === 'active'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {sub.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSubTab === 'compose' && (
                <div className="max-w-4xl">
                    <form onSubmit={handleSendBroadcast} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 glass-morphism">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-600/20 rounded-xl">
                                <Send className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Create New Broadcast</h3>
                                <p className="text-sm text-gray-400">Send an email update to all your subscribers.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Recipient Segment</label>
                                <select
                                    value={composeData.segment}
                                    onChange={(e) => setComposeData({ ...composeData, segment: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-purple-500 focus:outline-none appearance-none"
                                >
                                    <option value="all">All Subscribers ({subscribers.length})</option>
                                    <option value="active">Active Members</option>
                                    <option value="new">Joined Last 30 Days</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Campaign Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={composeData.subject}
                                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                                    placeholder="e.g. New Afrobeats Mix Out Now! 🎧"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Email Body (HTML Supported)</label>
                            <textarea
                                required
                                rows={12}
                                value={composeData.body}
                                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                                placeholder="Write your newsletter content here..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 italic">Pro-tip: You can use HTML tags to style your message.</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <div className="text-sm text-gray-400">
                                Estimated recipients: <span className="text-white font-bold">{subscribers.length}</span>
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                                >
                                    Save Draft
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="px-8 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {isSending ? 'Sending...' : 'Send Broadcast Now'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {activeSubTab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden glass-morphism">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Subject</th>
                                    <th className="px-6 py-4 font-medium">Sent Date</th>
                                    <th className="px-6 py-4 font-medium">Recipients</th>
                                    <th className="px-6 py-4 font-medium">Open Rate</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {campaignsLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading campaigns...</td>
                                    </tr>
                                ) : newsletterCampaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">
                                            No sent campaigns yet. Send your first broadcast to see history!
                                        </td>
                                    </tr>
                                ) : (
                                    newsletterCampaigns.map((camp) => (
                                        <tr key={camp.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <Mail className="w-4 h-4 text-purple-400" />
                                                    <span className="text-white font-medium">{camp.subject}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {camp.sentDate ? new Date(camp.sentDate).toLocaleDateString() : 'Draft'}
                                            </td>
                                            <td className="px-6 py-4 text-white">
                                                {camp.recipientCount || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-1 w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-purple-500"
                                                            style={{ width: `${camp.openRate || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400">{camp.openRate || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs border ${camp.status === 'sent'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    }`}>
                                                    {camp.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsletterTab;
