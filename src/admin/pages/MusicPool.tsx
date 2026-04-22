import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import {
    Music, Search, RefreshCw, FolderOpen, Play,
    Download, Hash, Clock, Layers, ChevronRight, X,
    Users, Activity, DollarSign, UserX, TrendingUp, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/context/DataContext';
import { REMIX_WORKER_URL } from '@/utils/r2';

const MusicPool: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const { 
        liveSubscriptions, adminStats, subsLoading, 
        refreshSubscriptions, updateSubscription 
    } = useData();
    const [tracks, setTracks] = useState<any[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [poolSubTab, setPoolSubTab] = useState<'tracks' | 'updates' | 'members'>('tracks');
    
    // Scanned Updates state
    const [isManualScanning, setIsManualScanning] = useState(false);
    const [manualScanMsg, setManualScanMsg] = useState('');
    const [scannedTracks, setScannedTracks] = useState<any[]>([]);
    const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
    const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());
    
    const [selectedScanYear, setSelectedScanYear] = useState<number | null>(null);
    const [selectedScanMonth, setSelectedScanMonth] = useState<string | null>(null);
    const [editingTrack, setEditingTrack] = useState<any | null>(null);

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (session) {
            if (poolSubTab === 'tracks') loadPool();
            else loadScanned();
        }
    }, [session, poolSubTab, selectedScanYear, selectedScanMonth]);

    const loadPool = async () => {
        try {
            const token = session?.access_token || '';
            const res = await fetch(`${REMIX_WORKER_URL}/api/admin/pool/tracks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const trackList = Array.isArray(data) ? data : (data?.tracks || []);
            setTracks(trackList);
            const uniqueFolders = [...new Set(trackList.map((t: any) => t.collection_hub || 'Main Pool'))] as string[];
            setFolders(uniqueFolders);
        } catch {
            toast.error('Failed to load music pool from Remix Worker');
        }
    };

    const loadScanned = async () => {
        try {
            let url = '/api/admin/scraped-tracks';
            const params = new URLSearchParams();
            if (selectedScanYear) params.append('year', selectedScanYear.toString());
            if (selectedScanMonth) params.append('month', selectedScanMonth);
            
            const data = await request(`${url}?${params.toString()}`);
            setScannedTracks(Array.isArray(data) ? data : (data?.tracks || []));
        } catch {
            toast.error('Failed to load scanned updates');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const token = session?.access_token || '';
            const res = await fetch(`${REMIX_WORKER_URL}/api/admin/pool/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Sync failed');
            const data = await res.json();
            toast.success(`Pool sync complete — ${data.synced || 0} track(s) indexed`);
            await loadPool();
        } catch {
            toast.error('Pool sync failed on Remix Worker');
        } finally {
            setSyncing(false);
        }
    };

    const handleFullRefresh = async () => {
        if (!confirm('This will wipe all track data and re-index everything from R2. Proceed?')) return;
        setSyncing(true);
        try {
            const token = session?.access_token || '';
            const res = await fetch(`${REMIX_WORKER_URL}/api/admin/pool/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            toast.success(`Full Re-index complete — ${data.count || 0} tracks indexed`);
            await loadPool();
        } catch (e: any) {
            toast.error(e.message || 'Full re-index failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleCheckDuplicates = async () => {
        try {
            const res = await request('/api/admin/scraped-tracks/check-duplicates', { method: 'POST' });
            setDuplicateIds(new Set(res.duplicates || []));
            if (res.duplicates?.length > 0) {
                toast.info(`Flagged ${res.duplicates.length} potential duplicates.`);
            } else {
                toast.success('No duplicates found in this batch.');
            }
        } catch {
            toast.error('Duplicate check failed');
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

    const handleApprove = async (ids: string[], allInFolder?: any) => {
        try {
            const res = await request('/api/admin/scraped-tracks/approve', {
                method: 'POST',
                body: JSON.stringify({ ids, allInFolder })
            });
            toast.success(`Successfully approved ${res.approved || 0} tracks.`);
            setSelectedScanIds(new Set());
            await loadScanned();
            await loadPool();
        } catch (e: any) {
            toast.error('Approval failed: ' + e.message);
        }
    };

    const handleSaveMetadata = async () => {
        if (!editingTrack) return;
        try {
            await request(`/api/admin/scraped-tracks/${editingTrack.id}`, {
                method: 'PATCH',
                body: JSON.stringify(editingTrack)
            });
            toast.success('Track metadata updated');
            setEditingTrack(null);
            await loadScanned();
        } catch {
            toast.error('Failed to save update');
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

    const handleSyncSubscription = async (id: string, status: string, expiry: string) => {
        try {
            await updateSubscription(id, {
                status: status as any,
                expiryDate: expiry
            });
        } catch (e: any) {
            console.error("Sync failed:", e);
            throw e;
        }
    };

    const handleRevokeSubscription = async (userEmail: string) => {
        if (!userEmail) return;
        try {
            const STORAGE_WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || '';
            const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/revoke-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ email: userEmail })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Revoke failed');
            
            toast.success("Protocol Terminated: Access revoked for " + userEmail);
            if (typeof refreshSubscriptions === 'function') refreshSubscriptions();
        } catch (e: any) {
            console.error("Revoke failed:", e);
            toast.error("Operation Failed: " + e.message);
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

    const formatDuration = (s: number) => {
        if (!s) return '—';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '—';
        if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const scanYears = Array.from(new Set(scannedTracks.map(t => Number(t.release_year))))
        .filter((y): y is number => typeof y === 'number' && !isNaN(y) && y > 0)
        .sort((a, b) => b - a);

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
                    <button 
                        onClick={() => setPoolSubTab('members')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'members' ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Members
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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="px-6 py-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20">
                                    <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest">{filteredTracks.length} Tracks</p>
                                </div>
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
                            </div>
                        </div>

                        <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Track</th>
                                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Folder</th>
                                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-8 py-20 text-center">
                                                <RefreshCw className="animate-spin inline mr-2 text-brand-purple" />
                                            </td>
                                        </tr>
                                    ) : filteredTracks.map((track, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:scale-110 transition-transform flex-shrink-0">
                                                        <Play size={14} fill="currentColor" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white tracking-tighter leading-tight">{track.title}</p>
                                                        <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">{track.artist}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase">{track.collection_hub || 'Main'}</td>
                                            <td className="px-8 py-6 text-[11px] font-black text-gray-400">{formatDuration(track.duration)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : poolSubTab === 'updates' ? (
                <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* ... Scanned Updates contents ... */}
                    <div className="xl:w-72 flex-shrink-0">
                        {/* Sidebar */}
                        <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-6 sticky top-12">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                <Clock size={14} className="text-brand-cyan" /> Scan Library
                            </h3>
                            {/* Library tree */}
                            <div className="space-y-4">
                                <button
                                    onClick={() => { setSelectedScanYear(null); setSelectedScanMonth(null); }}
                                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-left transition-all ${!selectedScanYear ? 'bg-brand-cyan text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">All Scans</span>
                                    <span className="text-[9px] font-black">{Math.min(scannedTracks.length, 500)}</span>
                                </button>
                                {scanYears.map(year => (
                                    <div key={year} className="space-y-1">
                                        <button
                                            onClick={() => { setSelectedScanYear(year); setSelectedScanMonth(null); }}
                                            className={`w-full flex items-center justify-between px-5 py-2 rounded-xl text-left transition-all ${selectedScanYear === year && !selectedScanMonth ? 'text-brand-cyan' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">{year}</span>
                                        </button>
                                        {(selectedScanYear === year || !selectedScanYear) && (
                                            <div className="grid grid-cols-2 gap-1 pl-4">
                                                {MONTH_NAMES.map(month => (
                                                    <button
                                                        key={month}
                                                        onClick={() => { setSelectedScanYear(year); setSelectedScanMonth(month); }}
                                                        className={`px-3 py-1.5 rounded-lg text-left text-[9px] font-black uppercase tracking-tighter transition-all ${selectedScanMonth === month && selectedScanYear === year ? 'bg-white/10 text-white border border-white/10' : 'text-gray-600 hover:text-gray-300'}`}
                                                    >
                                                        {month.slice(0, 3)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleManualScan}
                                disabled={isManualScanning}
                                className="w-full mt-6 py-4 rounded-2xl bg-brand-purple text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isManualScanning ? 'Scanning...' : 'Fresh Signal Scan'}
                            </button>
                        </div>
                    </div>
                    {/* Signal Intelligence Queue */}
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">Signals: {selectedScanMonth || 'All'} {selectedScanYear || ''}</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{scannedTracks.length} tracks detected</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCheckDuplicates} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">Check Duplicates</button>
                                {selectedScanIds.size > 0 && <button onClick={() => handleApprove(Array.from(selectedScanIds))} className="px-6 py-3 bg-brand-purple text-white text-[10px] font-black rounded-xl hover:scale-105 transition-all uppercase tracking-widest shadow-lg shadow-brand-purple/20">Approve Selected ({selectedScanIds.size})</button>}
                                {selectedScanYear && selectedScanMonth && <button onClick={() => handleApprove([], { year: selectedScanYear, month: selectedScanMonth })} className="px-6 py-3 bg-brand-cyan text-black text-[10px] font-black rounded-xl hover:scale-105 transition-all uppercase tracking-widest">Approve All in {selectedScanMonth.slice(0, 3)}</button>}
                            </div>
                        </div>
                        <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.01]">
                                    <tr>
                                        <th className="px-8 py-6 w-12"><input type="checkbox" checked={scannedTracks.length > 0 && selectedScanIds.size === scannedTracks.length} onChange={(e) => setSelectedScanIds(e.target.checked ? new Set(scannedTracks.map(t => t.id)) : new Set())} className="w-4 h-4 rounded-md border-white/10 bg-white/5 checked:bg-brand-purple transition-colors cursor-pointer" /></th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 underline decoration-brand-purple decoration-2 underline-offset-8">Track Data</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Metadata</th>
                                        <th className="px-8 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {scannedTracks.map((track) => {
                                        const isDup = duplicateIds.has(track.id);
                                        return (
                                            <tr key={track.id} className={`hover:bg-white/[0.02] transition-colors group ${isDup ? 'opacity-50' : ''}`}>
                                                <td className="px-8 py-6"><input type="checkbox" checked={selectedScanIds.has(track.id)} onChange={() => { const next = new Set(selectedScanIds); next.has(track.id) ? next.delete(track.id) : next.add(track.id); setSelectedScanIds(next); }} className="w-4 h-4 rounded-md border-white/10 bg-white/5 checked:bg-brand-purple transition-colors cursor-pointer" /></td>
                                                <td className="px-8 py-6"><div className="flex items-center gap-3"><div><div className="font-black text-white group-hover:text-brand-purple transition-colors text-sm tracking-tight">{track.title}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{track.artist}</div></div>{isDup && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-black uppercase rounded-md border border-red-500/20">Duplicate</span>}</div></td>
                                                <td className="px-8 py-6"><div className="flex gap-2"><span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400">{track.release_month} {track.release_year}</span><span className="px-2 py-1 bg-brand-purple/10 border border-brand-purple/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-brand-purple">{track.genre || 'Pool'}</span></div></td>
                                                <td className="px-8 py-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => setEditingTrack(track)} className="px-3 py-1.5 bg-white/5 text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:text-white transition-all">Edit</button><button onClick={() => handleApprove([track.id])} className="px-3 py-1.5 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-brand-purple hover:text-white transition-all">Approve</button><button onClick={() => handleReject(track.id)} className="px-3 py-1.5 bg-white/5 text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all">Dismiss</button></div></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard label="Active Wave" value={adminStats?.active_subs || 0} icon={Users} color="brand-cyan" trend="Active" trendUp={true} />
                        <StatCard label="Monthly Volume" value={adminStats?.monthly_sales_count || 0} icon={Activity} color="brand-purple" trend="MTD" trendUp={true} />
                        <StatCard label="Revenue Rate" value="98.2%" icon={Activity} color="brand-purple" trend="STABLE" trendUp={true} subtext="System health" />
                        <StatCard label="Recurrent" value={`KES ${(adminStats?.monthly_sales_amt || 0).toLocaleString()}`} icon={DollarSign} color="brand-purple" trend="LIVE" trendUp={true} subtext="Last 30 days" />
                    </div>

                    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-6">Identity</th>
                                        <th className="px-8 py-6">Access Tier</th>
                                        <th className="px-8 py-6">Investment</th>
                                        <th className="px-8 py-6">Expiration</th>
                                        <th className="px-8 py-6">Signal Status</th>
                                        <th className="px-8 py-6 text-right">Protocol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {subsLoading ? (
                                        <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Scanning Registry...</td></tr>
                                    ) : (liveSubscriptions || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-50">
                                                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center">
                                                        <Users size={40} className="text-gray-500" />
                                                    </div>
                                                    <p className="text-gray-500 font-black tracking-widest uppercase text-xs">No Signal Detected</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        (liveSubscriptions || []).map((sub: any) => {
                                            const expiry = sub.expiryDate ? new Date(sub.expiryDate) : null;
                                            const isExpired = !expiry || new Date() > expiry;
                                            const now = new Date();
                                            const diffTime = expiry ? expiry.getTime() - now.getTime() : 0;
                                            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                                            return (
                                                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-white group-hover:text-brand-cyan transition-colors">{sub.userName}</div>
                                                        <div className="text-[11px] text-gray-500 font-medium">{sub.userEmail}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white">{sub.planId}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-white font-black">KES {sub.amount?.toLocaleString() || '0'}</div>
                                                    </td>
                                                    <td className="px-8 py-6 font-black font-display text-xs tracking-wider text-gray-400">
                                                        {expiry && expiry.getTime() > 0 ? expiry.toLocaleDateString() : 'N/A'}
                                                        {expiry && !isExpired && (
                                                            <div className="text-[9px] text-brand-cyan mt-1 uppercase tracking-widest">{diffDays} days left</div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${!isExpired && sub.status === 'active'
                                                            ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20'
                                                            : 'bg-red-500/5 text-red-500 border-red-500/20'
                                                            }`}>
                                                            {!isExpired && sub.status === 'active' ? 'Signal Locked' : 'Frequency Lost'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            {(sub.status === 'active' || sub.status === 'past_due') && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => {
                                                                            toast.promise(handleSyncSubscription(sub.id, sub.status, sub.expiryDate), {
                                                                                loading: 'Resynchronizing signal...',
                                                                                success: 'Signal restored',
                                                                                error: 'Sync failed'
                                                                            });
                                                                        }} 
                                                                        className="p-3 text-brand-cyan hover:bg-brand-cyan/5 rounded-[1.25rem] border border-white/5 transition-all flex items-center gap-2 group-hover:scale-110"
                                                                        title="Sync with D1"
                                                                    >
                                                                        <RefreshCw size={18} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            if (confirm(`Revoke access for ${sub.userEmail}?`)) {
                                                                                handleRevokeSubscription(sub.userEmail);
                                                                            }
                                                                        }} 
                                                                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all"
                                                                        title="Terminate Protocol"
                                                                    >
                                                                        <UserX size={18} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Editing Modal */}
            {editingTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl">
                        <h4 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center justify-between">
                            Edit Signal Metadata
                            <button onClick={() => setEditingTrack(null)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                                <input value={editingTrack.title} onChange={e => setEditingTrack({...editingTrack, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-brand-purple/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Artist</label>
                                <input value={editingTrack.artist} onChange={e => setEditingTrack({...editingTrack, artist: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-brand-purple/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Year</label>
                                    <input type="number" value={editingTrack.release_year} onChange={e => setEditingTrack({...editingTrack, release_year: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-brand-purple/50" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Month</label>
                                    <select value={editingTrack.release_month} onChange={e => setEditingTrack({...editingTrack, release_month: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-brand-purple/50">
                                        {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button onClick={handleSaveMetadata} className="flex-1 py-4 bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all">Save Changes</button>
                            <button onClick={() => setEditingTrack(null)} className="flex-1 py-4 bg-white/5 text-gray-400 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: any;
    color?: string;
    trend?: string;
    trendUp?: boolean;
    subtext?: string;
}> = ({ label, value, icon: Icon, color = 'brand-purple', trend, trendUp = true, subtext }) => (
    <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:border-white/10">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color.replace('text-', '')}/10 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-${color.replace('text-', '')}/20 transition-all duration-700`} />
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={`w-14 h-14 rounded-2xl bg-${color.replace('text-', '')}/10 border border-${color.replace('text-', '')}/20 flex items-center justify-center text-${color}/100 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <Icon size={28} className={`text-${color.replace('text-', '')}`} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${trendUp ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend}
                </div>
            )}
        </div>
        <div className="relative z-10">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-1 group-hover:text-gray-400 transition-colors">{label}</p>
            <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black text-white tracking-tighter group-hover:text-shadow-glow transition-all">{value}</h4>
            </div>
            {subtext && <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{subtext}</p>}
        </div>
    </div>
);

export default MusicPool;
