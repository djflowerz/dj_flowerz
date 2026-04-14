import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Disc, Music, Zap, Flame, Terminal } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CrateDiggerProps {
  onSuggest: (filters: { search?: string; genre?: string; bpmMin?: number; bpmMax?: number; isHype?: boolean }) => void;
}

const CrateDigger: React.FC<CrateDiggerProps> = ({ onSuggest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Yo! I'm the Crate Digger. I've indexed over 90,000 tracks in the pool. What's the vibe for your next set? (e.g., 'Gimme some 125 BPM Tech House' or 'Looking for hype Afrobeats')",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    // Simulate AI Processing
    setTimeout(() => {
      let response = "I'm digging through the crates... ";
      let suggestions: any = {};

      const lowerInput = currentInput.toLowerCase();
      
      if (lowerInput.includes('bpm')) {
        const bpmMatch = lowerInput.match(/(\d{2,3})\s*bpm/);
        if (bpmMatch) {
          const bpm = parseInt(bpmMatch[1]);
          suggestions.bpmMin = bpm - 2;
          suggestions.bpmMax = bpm + 2;
          response += `Found some fire gems around ${bpm} BPM! `;
        }
      }

      if (lowerInput.includes('house')) {
        suggestions.genre = 'House';
        response += "Filtering for deep grooves and house heaters. ";
      } else if (lowerInput.includes('afro')) {
        suggestions.genre = 'Afrobeats';
        response += "Syncing with the motherland... Afrobeats incoming. ";
      } else if (lowerInput.includes('amapiano')) {
          suggestions.genre = 'Amapiano';
          response += "The log drum is calling. Amapiano selected. ";
      }

      if (lowerInput.includes('hype') || lowerInput.includes('energetic')) {
        suggestions.isHype = true;
        response += "Enabling Hype Protocol. High energy tracks only! ";
      }

      if (Object.keys(suggestions).length === 0) {
        suggestions.search = currentInput;
        response = `Hunting for "${currentInput}" in the archives. Direct link established.`;
      } else {
        response += "Check the pool results now!";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Execute the suggestion
      onSuggest(suggestions);
      toast.success("Crate Digger updated your filters!");
    }, 1500);
  };

  return (
    <div className="fixed bottom-32 right-8 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
            className="w-[380px] h-[500px] bg-[#0B0B0F]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(138,43,226,0.1)] mb-6 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-brand-purple/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple border border-brand-purple/20">
                  <Bot size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Crate Digger AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Live Support</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
            >
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-medium leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-brand-purple text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-black/40 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Tell me what to dig for..."
                  className="w-full bg-[#15151A] border border-white/5 rounded-2xl py-4 pl-5 pr-12 text-xs focus:outline-none focus:border-brand-purple transition-all italic text-gray-300"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-brand-purple text-white flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-brand-purple/20"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                 {['120 BPM', 'Afrobeats', 'Tech House', 'Hype Gems'].map(tag => (
                   <button 
                    key={tag}
                    onClick={() => { setInput(tag); }}
                    className="whitespace-nowrap px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                   >
                     {tag}
                   </button>
                 ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-brand-purple to-brand-cyan text-white shadow-[0_0_30px_rgba(138,43,226,0.3)] flex items-center justify-center relative group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity" />
        {isOpen ? <X size={32} /> : <Bot size={32} />}
        
        {/* Badge */}
        {!isOpen && (
           <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#050505] flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
           </div>
        )}
      </motion.button>
    </div>
  );
};

export default CrateDigger;
