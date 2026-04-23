/**
 * components/admin/WhatsAppManager.tsx
 *
 * Polls your Railway service's /status endpoint every 3 seconds.
 * Shows live state + QR code for scanning.
 *
 * Add to AdminDashboard inside the "system" tab section.
 */

import React, { useEffect, useRef, useState } from 'react';

interface StateInfo {
  label: string;
  color: string;
  dot: string;
  bg: string;
}

const STATES: Record<string, StateInfo> = {
  idle:          { label: 'Not started',      color: '#94a3b8', dot: '#cbd5e1', bg: '#1e293b' },
  initializing:  { label: 'Starting up…',    color: '#f59e0b', dot: '#fbbf24', bg: '#2d1f00' },
  qr:            { label: 'Awaiting scan',   color: '#60a5fa', dot: '#3b82f6', bg: '#0c1a2e' },
  authenticated: { label: 'Authenticating…', color: '#a78bfa', dot: '#7c3aed', bg: '#1a0e2e' },
  ready:         { label: 'Connected ✓',     color: '#4ade80', dot: '#16a34a', bg: '#0a1f0f' },
  disconnected:  { label: 'Disconnected',    color: '#f87171', dot: '#dc2626', bg: '#200a0a' },
  error:         { label: 'Unreachable',     color: '#f87171', dot: '#dc2626', bg: '#200a0a' },
};

interface Props {
  railwayUrl?: string;
  apiKey?: string;
}

const WhatsAppManager: React.FC<Props> = ({
  railwayUrl = import.meta.env.VITE_WHATSAPP_SERVICE_URL || '',
  apiKey     = import.meta.env.VITE_WHATSAPP_API_KEY || '',
}) => {
  const [state,    setState]    = useState('idle');
  const [qr,       setQr]       = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [dotPulse, setDotPulse] = useState(false);
  const prevState = useRef('idle');
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    if (!railwayUrl) { setState('error'); return; }
    try {
      const res = await fetch(`${railwayUrl}/status`, {
        headers: { 'X-API-Key': apiKey },
        cache: 'no-store',
      });
      if (!res.ok) { setState('error'); return; }
      const data = await res.json();

      if (data.state !== prevState.current) {
        setDotPulse(true);
        setTimeout(() => setDotPulse(false), 700);
        prevState.current = data.state;
      }

      setState(data.state);
      setQr(data.state === 'qr' ? data.qr : null);
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [railwayUrl, apiKey]);

  const handleDisconnect = async () => {
    setLoading(true);
    await fetch(`${railwayUrl}/disconnect`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    }).catch(() => {});
    setLoading(false);
    fetchStatus();
  };

  const info = STATES[state] ?? STATES.idle;
  const isSpinning = state === 'initializing' || state === 'authenticated';

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-6 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">WhatsApp OTP Service</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 flex items-center justify-center text-lg shadow-lg shadow-[#25D366]/10">
          💬
        </div>
      </div>

      {/* Status badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black mb-5 transition-all"
        style={{ background: info.bg, color: info.color }}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
            state === 'ready' ? 'shadow-[0_0_0_3px_rgba(74,222,128,0.2)]' : ''
          } ${dotPulse ? 'scale-150 opacity-50' : ''}`}
          style={{ background: info.dot }}
        />
        {info.label}
      </div>

      {/* QR Code */}
      {state === 'qr' && qr && (
        <div className="mb-5 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-3 text-center mb-4">
            <img src={qr} alt="Scan with WhatsApp" className="w-48 h-48 mx-auto rounded-lg" />
            <p className="text-[10px] text-gray-400 mt-2 font-mono">Scan with WhatsApp to link</p>
          </div>
          <ol className="space-y-2 text-[11px] text-gray-500">
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">1</span>Open WhatsApp on your phone</li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">2</span>Tap ⋮ → Linked Devices → Link a Device</li>
            <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">3</span>Scan the QR code above</li>
          </ol>
        </div>
      )}

      {/* Spinner states */}
      {isSpinning && (
        <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in duration-300">
          <div className="w-5 h-5 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-[10px] text-gray-500 font-mono">
            {state === 'initializing' ? 'starting whatsapp client...' : 'completing auth...'}
          </p>
        </div>
      )}

      {/* Ready */}
      {state === 'ready' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center mb-4">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm font-black text-emerald-400">WhatsApp is live</p>
            <p className="text-[10px] text-emerald-600 font-mono mt-1">OTPs delivered via this session</p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full py-2.5 bg-transparent border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40"
          >
            {loading ? '...' : 'Disconnect Session'}
          </button>
        </div>
      )}

      {/* Idle/Error */}
      {['idle', 'error', 'disconnected'].includes(state) && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-white/10 border-t-gray-400 rounded-full animate-spin" />
          <p className="text-[10px] text-gray-600 font-mono">
            {state === 'error' ? 'cannot reach railway service...' : 'waiting for connection...'}
          </p>
          {!railwayUrl && (
            <p className="text-[10px] text-red-400 text-center">
              Set VITE_WHATSAPP_SERVICE_URL in your .env
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppManager;
