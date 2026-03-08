
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.group('ErrorBoundary caught an error:');
        console.error(error);
        console.error(errorInfo);
        console.groupEnd();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white p-10">
                    <div className="max-w-2xl w-full bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            </div>
                            <h1 className="text-2xl font-black tracking-tighter">System Error Detected</h1>
                        </div>
                        <p className="text-gray-400 mb-8 font-medium leading-relaxed">The admin interface encountered a critical logic failure. The details below have been logged to the console for the developer.</p>
                        <div className="bg-black/40 p-6 rounded-3xl overflow-auto text-xs font-mono text-red-400 border border-white/5 mb-8 max-h-64">
                            {this.state.error?.message}
                            {this.state.error?.stack && (
                                <div className="mt-4 opacity-50 whitespace-pre">
                                    {this.state.error.stack}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase tracking-widest text-[10px]"
                            >
                                Re-sync Matrix
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all border border-white/10 active:scale-95 uppercase tracking-widest text-[10px]"
                            >
                                Abort to Hub
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
