import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Users, Hash, MessageSquare, Loader2, TrendingUp, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://djflowerz-worker.ianmuriithi58.workers.dev';

type SearchType = 'all' | 'users' | 'posts' | 'hashtags';

interface UserResult {
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string;
  bio: string;
  role: string;
  is_verified: number;
  followers_count: number;
}

interface PostResult {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  author_avatar: string;
  media_urls: string | null;
  like_count: number;
  reply_count: number;
  reshare_count: number;
  created_at: string;
  hashtags: string | null;
  is_marketplace: number;
}

interface HashtagResult {
  tag: string;
  post_count: number;
}

interface SearchResults {
  users: UserResult[];
  posts: PostResult[];
  hashtags: HashtagResult[];
}

const TRENDING_TOPICS = ['#DJFlowerz', '#Nairobi', '#AfroBeats', '#LiveSet', '#MusicPool'];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialQ = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as SearchType) || 'all';

  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<SearchType>(initialType);
  const [results, setResults] = useState<SearchResults>({ users: [], posts: [], hashtags: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialQ);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, type: SearchType) => {
    if (!q.trim()) {
      setResults({ users: [], posts: [], hashtags: [] });
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(q)}&type=${type}`);
      if (res.ok) {
        const data = await res.json() as SearchResults;
        setResults(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) doSearch(initialQ, initialType);
    inputRef.current?.focus();
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(val ? { q: val, type: activeTab } : {});
      doSearch(val, activeTab);
    }, 350);
  };

  const handleTabChange = (tab: SearchType) => {
    setActiveTab(tab);
    if (query) {
      setSearchParams({ q: query, type: tab });
      doSearch(query, tab);
    }
  };

  const totalResults = results.users.length + results.posts.length + results.hashtags.length;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-20">
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-purple-500/50 focus-within:bg-white/8 transition-all">
          <SearchIcon size={18} className="text-white/40 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search people, posts, hashtags…"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
            id="global-search-input"
          />
          {loading && <Loader2 size={16} className="text-purple-400 animate-spin flex-shrink-0" />}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setSearched(false); setResults({ users: [], posts: [], hashtags: [] }); setSearchParams({}); }} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {searched && (
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl border border-white/10">
          {([['all', 'All'], ['users', 'People'], ['posts', 'Posts'], ['hashtags', 'Tags']] as [SearchType, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* No query — trending topics */}
      {!searched && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-400" />
            <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Trending</span>
          </div>
          <div className="space-y-1">
            {TRENDING_TOPICS.map(t => (
              <button
                key={t}
                onClick={() => { setQuery(t); handleInput(t); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <span className="text-purple-400 font-semibold text-sm">{t}</span>
                <ArrowRight size={14} className="text-white/20 group-hover:text-purple-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {searched && !loading && totalResults === 0 && (
        <div className="text-center py-16">
          <SearchIcon size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No results for <span className="text-white/70">"{query}"</span></p>
          <p className="text-white/20 text-xs mt-1">Try different keywords or check spelling</p>
        </div>
      )}

      {searched && !loading && (
        <div className="space-y-6">
          {/* User Results */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <section>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">People</span>
                </div>
              )}
              <div className="space-y-2">
                {results.users.map(u => (
                  <Link
                    key={u.user_id}
                    to={`/member/${u.handle || u.user_id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-800/50 overflow-hidden flex-shrink-0">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{(u.display_name || '?')[0].toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-white truncate">{u.display_name}</span>
                        {u.is_verified ? <span className="text-purple-400 text-xs">✓</span> : null}
                        {u.role === 'dj' && <span className="text-[10px] bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">DJ</span>}
                      </div>
                      <span className="text-white/40 text-xs">@{u.handle || 'user'}</span>
                      {u.bio && <p className="text-white/50 text-xs mt-0.5 truncate">{u.bio}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/30 text-xs">{(u.followers_count || 0).toLocaleString()}</p>
                      <p className="text-white/20 text-[10px]">followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Post Results */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <section>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Posts</span>
                </div>
              )}
              <div className="space-y-3">
                {results.posts.map(p => {
                  const mediaUrls = (() => { try { return JSON.parse(p.media_urls || '[]'); } catch { return []; } })();
                  return (
                    <Link
                      key={p.id}
                      to={`/post/${p.id}`}
                      className="block p-4 rounded-xl bg-white/3 border border-white/8 hover:border-purple-500/30 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-purple-800/50 overflow-hidden flex-shrink-0">
                          {p.author_avatar
                            ? <img src={p.author_avatar} alt={p.author_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(p.author_name || '?')[0]}</div>
                          }
                        </div>
                        <span className="text-white/70 text-xs font-semibold">{p.author_name}</span>
                        <span className="text-white/30 text-xs">·</span>
                        <span className="text-white/30 text-xs">@{p.author_handle}</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed line-clamp-3">{p.content}</p>
                      {mediaUrls.length > 0 && (
                        <div className="mt-2 flex gap-1 overflow-hidden rounded-lg">
                          <img src={mediaUrls[0]} alt="" className="w-full h-32 object-cover rounded-lg" />
                        </div>
                      )}
                      <div className="flex gap-4 mt-2 text-white/30 text-xs">
                        <span>❤️ {p.like_count || 0}</span>
                        <span>💬 {p.reply_count || 0}</span>
                        <span>🔁 {p.reshare_count || 0}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Hashtag Results */}
          {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
            <section>
              {activeTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <Hash size={14} className="text-green-400" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Hashtags</span>
                </div>
              )}
              <div className="space-y-1">
                {results.hashtags.map(h => (
                  <button
                    key={h.tag}
                    onClick={() => { setQuery(h.tag); handleInput(h.tag); setActiveTab('posts'); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-bold text-sm">#{h.tag.replace(/^#/, '')}</span>
                    </div>
                    <span className="text-white/30 text-xs">{h.post_count} posts</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
