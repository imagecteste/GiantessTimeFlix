import React, { useState, useEffect } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { AppView, AuthSession, Series } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  authSession: AuthSession;
  searchableSeries: Series[];
  onOpenSeries: (series: Series) => void;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Navbar({
  currentView,
  setView,
  authSession,
  searchableSeries,
  onOpenSeries,
  onLogin,
  onLogout,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: { label: string; view: AppView }[] = [
    { label: 'Home', view: 'home' },
    { label: 'Series', view: 'series' },
    { label: 'Updated', view: 'movies' },
    { label: 'Trailers', view: 'trailers' },
  ];
  const filteredSeries = searchableSeries
    .filter((series) => series.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .slice(0, 6);

  return (
    <nav 
      className={`fixed top-0 z-50 w-full transition-colors duration-300 px-4 md:px-12 py-6 flex items-center justify-between ${
        isScrolled ? 'bg-editorial-bg' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="flex items-center gap-10">
        <h1 
          onClick={() => setView('home')}
          className="text-editorial-red text-xl sm:text-2xl md:text-3xl font-black tracking-tighter cursor-pointer uppercase transition-all"
        >
          GIANTESS<span className="text-white">TIME</span>FLIX
        </h1>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <button
              key={link.view}
              onClick={() => setView(link.view)}
              className={`relative py-1 transition-colors uppercase tracking-widest ${
                currentView === link.view ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
              {currentView === link.view && (
                <motion.div 
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 w-full h-0.5 bg-editorial-red" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        <button
          type="button"
          onClick={() => {
            setIsLogoutConfirmOpen(false);
            setIsSearchOpen((currentValue) => !currentValue);
          }}
          className="hover:text-white transition-colors opacity-70"
          aria-label="Search series"
        >
          <Search className="w-5 h-5 cursor-pointer" />
        </button>
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-editorial-bg shadow-2xl p-4 space-y-3"
            >
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search series..."
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-editorial-red"
                autoFocus
              />
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searchQuery.trim().length === 0 ? (
                  <p className="text-sm text-gray-500">Type a series title to search.</p>
                ) : filteredSeries.length > 0 ? (
                  filteredSeries.map((series) => (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        onOpenSeries(series);
                      }}
                      className="w-full text-left rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-editorial-red/60 hover:bg-white/[0.05] transition-colors"
                    >
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                        {series.title}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-1">
                        {series.episodeCount} {series.episodeCount === 1 ? 'Episode' : 'Episodes'}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No matching series found.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {authSession.isAuthenticated ? (
          <div className="hidden md:flex items-center gap-3 relative">
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen((currentValue) => !currentValue)}
              className="text-[11px] uppercase tracking-[0.2em] text-gray-300 hover:text-white transition-colors font-bold"
            >
              Log Out
            </button>
            <AnimatePresence>
              {isLogoutConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full right-0 mt-3 w-56 rounded-xl border border-white/10 bg-editorial-bg shadow-2xl p-4 space-y-3"
                >
                  <p className="text-sm text-white font-semibold">Are you sure?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogoutConfirmOpen(false);
                        onLogout();
                      }}
                      className="inline-flex items-center justify-center bg-white text-black px-3 py-2 rounded font-bold hover:bg-white/90 transition-all text-xs uppercase tracking-[0.15em]"
                    >
                      Log Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className="inline-flex items-center justify-center bg-white/10 text-white px-3 py-2 rounded font-bold hover:bg-white/15 transition-all border border-white/10 text-xs uppercase tracking-[0.15em]"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="hidden md:inline-flex items-center justify-center bg-white text-black px-4 py-2 rounded font-bold hover:bg-white/90 transition-all text-xs uppercase tracking-[0.2em]"
          >
            Patreon Login
          </button>
        )}
        <button 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 w-full bg-editorial-bg border-b border-white/10 flex flex-col items-center py-8 gap-6 md:hidden shadow-2xl"
          >
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => {
                  setView(link.view);
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setIsLogoutConfirmOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                className={`text-lg transition-colors uppercase tracking-widest ${
                  currentView === link.view ? 'text-editorial-red font-bold' : 'text-gray-400'
                }`}
              >
                {link.label}
              </button>
            ))}
            {authSession.isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen((currentValue) => !currentValue)}
                  className="text-lg transition-colors uppercase tracking-widest text-gray-400"
                >
                  Log Out
                </button>
                <AnimatePresence>
                  {isLogoutConfirmOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="w-[90%] max-w-xs rounded-xl border border-white/10 bg-black/40 p-4 space-y-3"
                    >
                      <p className="text-sm text-white font-semibold text-center">Are you sure?</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsLogoutConfirmOpen(false);
                            setIsMobileMenuOpen(false);
                            onLogout();
                          }}
                          className="inline-flex items-center justify-center bg-white text-black px-3 py-2 rounded font-bold hover:bg-white/90 transition-all text-xs uppercase tracking-[0.15em]"
                        >
                          Log Out
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLogoutConfirmOpen(false)}
                          className="inline-flex items-center justify-center bg-white/10 text-white px-3 py-2 rounded font-bold hover:bg-white/15 transition-all border border-white/10 text-xs uppercase tracking-[0.15em]"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setIsLogoutConfirmOpen(false);
                  onLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="text-lg transition-colors uppercase tracking-widest text-gray-400"
              >
                Patreon Login
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
