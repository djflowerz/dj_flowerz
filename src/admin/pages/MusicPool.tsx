import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import {
    Music, Search, RefreshCw, FolderOpen, Play,
    Download, Hash, Clock, Layers, ChevronRight, X
} from 'lucide-react';
import { toast } from 'sonner';

const MusicPool: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [tracks, setTracks] = useState<any[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [poolSubTab, setPoolSubTab] = useState<'tracks' | 'updates'>('tracks');
    
    // Scanned Updates state
    const [isManualScanning, setIsManualScanning] = useState(false);
    const [manualScanMsg, setManualScanMsg] = useState('');
    const [scannedTracks, setScannedTracks] = useState<any[]>([]);
    const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (session) {
            if (poolSubTab === 'tracks') loadPool();
            else loadScanned();
        }
    }, [session, poolSubTab]);

    const loadPool = async () => {
        try {
            const data = await request('/api/admin/pool/tracks');
            const trackList = Array.isArray(data) ? data : (data?.tracks || []);
            setTracks(trackList);

            // Extract unique collection hubs (folders)
            const uniqueFolders = [...new Set(trackList.map((t: any) => t.collection_hub || 'Main Pool'))] as string[];
            setFolders(uniqueFolders);
        } catch {
            toast.error('Failed to load music pool');
        }
    };

    const loadScanned = async () => {
        try {
            const data = await request('/api/admin/scraped-tracks');
            setScannedTracks(Array.isArray(data) ? data : (data?.tracks || []));
        } catch {
            toast.error('Failed to load scanned updates');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await request('/api/admin/pool/sync', { method: 'POST' });
            toast.success(`Pool sync complete — ${res.synced || 0} track(s) indexed`);
            await loadPool();
        } catch {
            toast.error('Pool sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleFullRefresh = async () => {
        if (!confirm('This will wipe all track data and re-index everything from R2. This is useful for clearing old/orphaned records. Proceed?')) return;
        
        setSyncing(true);
        try {
            const res = await request('/api/admin/pool/refresh', { method: 'POST' });
            toast.success(`Full Re-index complete — ${res.count || 0} tracks indexed`);
            await loadPool();
        } catch (e: any) {
            toast.error(e.message || 'Full re-index failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleManualScan = async () => {
        setIsManualScanning(true);
        setManualScanMsg('Initializing signal scan...');
        try {
            const res = await request('/api/admin/scraped-tracks/scan', { method: 'POST' });
            setManualScanMsg(`Scan complete. Found ${res.new_tracks || 0} news tracks.`);
            toast.success(`Detected ${res.new_tracks || 0} new external track signals.`);
            await loadScanned();
        } catch (err: any) {
            toast.error('Scan failed: ' + err.message);
        } finally {
            setIsManualScanning(false);
        }
    };

    const handleBulkAdd = async () => {
        if (selectedScanIds.size === 0) return;
        
        const toProcess = Array.from(selectedScanIds);
        try {
            const res = await request('/api/admin/scraped-tracks/approve', {
                method: 'POST',
                body: JSON.stringify({ ids: toProcess })
            });
            toast.success(`Successfully approved ${res.approved || 0} tracks into the pool.`);
            setSelectedScanIds(new Set());
            await loadScanned();
            await loadPool();
        } catch (e: any) {
            toast.error('Approval failed: ' + e.message);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await request(`/api/admin/scraped-tracks/${id}`, { method: 'DELETE' });
            toast.success('Track signal dismissed');
            await loadScanned();
        } catch (e: any) {
            toast.error('Failed to dismiss signal');
        }
    };

    const filteredTracks = tracks.filter(t => {
        const matchSearch = searchTerm
            ? (t.title || t.key || '').toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        const matchFolder = selectedFolder
            ? (t.collection_hub || 'Main Pool') === selectedFolder
            : true;
        return matchSearch && matchFolder;
    });

    const formatSize = (bytes: number) => {
        if (!bytes) return '—';
        if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const formatDuration = (s: number) => {
        if (!s) return '—';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <AdminLayout title="Music Pool">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Audio <span className="text-brand-purple">Repository</span></h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Management Protocol & Signal Intelligence</p>
                </div>
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <button 
                        onClick={() => setPoolSubTab('tracks')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'tracks' ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Active Tracks
                    </button>
                    <button 
                        onClick={() => setPoolSubTab('updates')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'updates' ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Scanned Updates
                    </button>
                </div>
            </div>

            {poolSubTab === 'tracks' ? (
                <div className="flex flex-col xl:flex-row gap-8">
                {/* Left: Folder sidebar */}
                <div className="xl:w-72 flex-shrink-0">
                    <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-6 sticky top-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <FolderOpen size={14} className="text-brand-yellow" /> Folders
                            </h3>
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{folders.length}</span>
                        </div>
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedFolder(null)}
                                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-left transition-all ${!selectedFolder ? 'bg-brand-purple text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={12} /> All Tracks
                                </span>
                                <span className="text-[9px] font-black">{tracks.length}</span>
                            </button>
                            {folders.map(folder => {
                                const count = tracks.filter(t => (t.collection_hub || 'Main Pool') === folder).length;
                                return (
                                    <button
                                        key={folder}
                                        onClick={() => setSelectedFolder(folder)}
                                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-left transition-all ${selectedFolder === folder ? 'bg-brand-purple text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 truncate">
                                            <ChevronRight size={10} className="flex-shrink-0" />
                                            <span className="truncate">{folder}</span>
                                        </span>
                                        <span className="text-[9px] font-black flex-shrink-0 ml-2">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Syncing...' : 'Quick Sync'}
                            </button>
                            <button
                                onClick={handleFullRefresh}
                                disabled={syncing}
                                className="w-full mt-3 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                Full Re-index
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Track list */}
                <div className="flex-1">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="px-6 py-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20">
                                <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest">{filteredTracks.length} Tracks</p>
                            </div>
                            {selectedFolder && (
                                <div className="px-6 py-3 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20">
                                    <p className="text-[11px] font-black text-brand-yellow uppercase tracking-widest truncate max-w-[200px]">{selectedFolder}</p>
                                </div>
                            )}
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH TRACKS..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-12 pr-12 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 w-72"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Track</th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Folder</th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                                        <Clock size={12} className="inline mr-1" />Duration
                                    </th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                                        <Download size={12} className="inline mr-1" />Size
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Loading Pool...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTracks.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-6 opacity-40">
                                                <Music size={48} className="text-gray-600" />
                                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                                                    {searchTerm ? 'No tracks match your search' : 'Music pool is empty — run a sync'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTracks.map((track, i) => (
                                    <tr key={track.id || track.key || i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:scale-110 transition-transform flex-shrink-0">
                                                    <Play size={14} fill="currentColor" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white tracking-tighter group-hover:text-brand-purple transition-colors leading-tight">
                                                        {track.title || track.key?.split('/').pop() || 'Untitled'}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                                                        {track.artist || track.genre || 'Unknown Artist'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <FolderOpen size={12} className="text-brand-yellow flex-shrink-0" />
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[140px]">
                                                    {track.collection_hub || 'Main Pool'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                {formatDuration(track.duration)}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                                {formatSize(track.versions?.[0]?.fileSize || 0)}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-brand-purple/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple group-hover:bg-brand-purple/20 transition-colors">
                                <RefreshCw size={32} className={isManualScanning ? 'animate-spin' : ''} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Manual Signal Scan</h3>
                                <p className="text-sm text-gray-500 font-medium">
                                    {isManualScanning ? manualScanMsg : 'Scan external sources for new tracks to index'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
                            <button 
                                onClick={handleManualScan}
                                disabled={isManualScanning}
                                className="px-8 py-3.5 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-brand-purple/20 flex items-center gap-2"
                            >
                                <Search size={16} />
                                {isManualScanning ? 'Scanning...' : 'Start Manual Scan'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">External Signals Detected</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Pending Indexing Queue</p>
                            </div>
                            {selectedScanIds.size > 0 && (
                                <button 
                                    onClick={handleBulkAdd}
                                    className="px-6 py-3 bg-brand-cyan text-black text-[11px] font-black rounded-xl hover:bg-cyan-400 transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    Add Selected ({selectedScanIds.size})
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-[#0B0B0F] border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-6 w-12">
                                            <input 
                                                type="checkbox" 
                                                checked={scannedTracks.length > 0 && selectedScanIds.size === scannedTracks.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedScanIds(new Set(scannedTracks.map(t => t.id)));
                                                    else setSelectedScanIds(new Set());
                                                }}
                                                className="w-4 h-4 rounded-md border-white/10 bg-white/5 checked:bg-brand-purple transition-colors cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Track Signal</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Source Point</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Genre Metadata</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {scannedTracks.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-32 text-center">
                                                <div className="flex flex-col items-center gap-6 opacity-30">
                                                    <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center">
                                                        <Search size={40} className="text-gray-500" />
                                                    </div>
                                                    <p className="text-gray-500 font-black tracking-widest uppercase text-xs">No signals cached. Initialize scanner.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        scannedTracks.map((track) => (
                                            <tr key={track.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedScanIds.has(track.id)}
                                                        onChange={() => {
                                                            const next = new Set(selectedScanIds);
                                                            next.has(track.id) ? next.delete(track.id) : next.add(track.id);
                                                            setSelectedScanIds(next);
                                                        }}
                                                        className="w-4 h-4 rounded-md border-white/10 bg-white/5 checked:bg-brand-purple transition-colors cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-white group-hover:text-brand-purple transition-colors">{track.title}</div>
                                                    <div className="text-[11px] text-gray-500 font-medium">{track.artist}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400">{track.source}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 rounded-full text-[9px] font-black uppercase tracking-widest text-brand-purple">{track.genre || 'Unclassified'}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                const next = new Set([track.id]);
                                                                setSelectedScanIds(next);
                                                                handleBulkAdd();
                                                            }}
                                                            className="px-4 py-2 bg-brand-purple text-white border border-brand-purple/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-purple/80 transition-all"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReject(track.id)}
                                                            className="px-4 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 transition-all"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default MusicPool;
