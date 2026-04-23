import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AuthSession } from '../types';

const subscribeImageUrl =
  'https://drive.google.com/thumbnail?id=1V9Yo3ZmJkSFbnbztgolZ7N6ryKLCTxbY&sz=w2000';

interface AccessRequiredModalProps {
  isOpen: boolean;
  authSession: AuthSession;
  onClose: () => void;
  onLogin: () => void;
  onWatchFreeContent: () => void;
}

export default function AccessRequiredModal({
  isOpen,
  authSession,
  onClose,
  onLogin,
  onWatchFreeContent,
}: AccessRequiredModalProps) {
  const primaryActionLabel = authSession.isAuthenticated
    ? 'Become a Member'
    : 'Log In with Patreon';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm px-4 py-6 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-editorial-bg shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 md:px-6 py-5 border-b border-white/10">
              <div className="space-y-2">
                <p className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase text-editorial-red">
                  Members Only
                </p>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                  Unlock Full Access
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Close access prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 md:px-6 py-6 md:py-7 space-y-5">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
                <img
                  src={subscribeImageUrl}
                  alt="Subscribe on Patreon"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 md:h-72 object-cover"
                />
              </div>
              <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                Full series access is reserved for Patreon members subscribed to the{' '}
                <span className="font-bold text-white">Fugitive Tiny plan or above</span> on
                GiantessTime.{' '}
                {authSession.isAuthenticated
                  ? 'Upgrade your pledge to unlock the full library.'
                  : 'Log in with Patreon to verify your membership or upgrade your pledge to unlock the full library.'}
              </p>
              {authSession.isAuthenticated ? (
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                  If you just subscribed, please log out and log back in so we can refresh your
                  membership access.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onWatchFreeContent}
                  className="inline-flex items-center justify-center bg-white/10 text-white px-6 py-3 rounded font-bold hover:bg-white/15 transition-all border border-white/10 text-sm sm:text-base"
                >
                  Watch Free Content
                </button>
                {authSession.isAuthenticated ? (
                  <a
                    href="https://www.patreon.com/cw/GiantessTime/membership"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center bg-white text-black px-6 py-3 rounded font-bold hover:bg-white/90 transition-all shadow-xl text-sm sm:text-base"
                  >
                    {primaryActionLabel}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onLogin}
                    className="inline-flex items-center justify-center bg-white text-black px-6 py-3 rounded font-bold hover:bg-white/90 transition-all shadow-xl text-sm sm:text-base"
                  >
                    {primaryActionLabel}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
