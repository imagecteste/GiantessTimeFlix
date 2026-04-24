import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Episode } from '../types';
import { AnimatePresence, motion } from 'motion/react';
import playerjs from 'player.js';

interface VideoPlayerModalProps {
  episode: Episode | null;
  isOpen: boolean;
  nextEpisode: Episode | null;
  onPlaybackUsageTracked: (episode: Episode, watchedMilliseconds: number) => void;
  onWatchNext: (episode: Episode) => void;
  onClose: () => void;
}

function buildAutoplayUrl(playbackUrl: string, videoId: string): string {
  const embedUrl = new URL(playbackUrl);
  embedUrl.searchParams.set('autoplay', 'true');
  embedUrl.searchParams.set('muted', 'false');
  embedUrl.searchParams.set('playerInstance', videoId);
  return embedUrl.toString();
}

const LEGACY_WARNING_MESSAGE =
  'This video is still a very old GiantessTime production, so the quality and realism are nowhere near ideal compared to the more recent ones. However, it’s an episode that may be relevant to the story—would you still like to watch it?';

async function exitFullscreenIfActive(): Promise<void> {
  if (!document.fullscreenElement) {
    return;
  }

  await document.exitFullscreen();
}

export default function VideoPlayerModal({
  episode,
  isOpen,
  nextEpisode,
  onPlaybackUsageTracked,
  onWatchNext,
  onClose,
}: VideoPlayerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playbackStartedAtRef = useRef<number | null>(null);
  const [hasAcknowledgedLegacyWarning, setHasAcknowledgedLegacyWarning] = useState(false);
  const [hasPlaybackEnded, setHasPlaybackEnded] = useState(false);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);

  const reportPlaybackUsage = (shouldResetPlaybackStart: boolean) => {
    if (playbackStartedAtRef.current === null || !episode) {
      return;
    }

    const watchedMilliseconds = Date.now() - playbackStartedAtRef.current;
    if (watchedMilliseconds > 0) {
      onPlaybackUsageTracked(episode, watchedMilliseconds);
    }

    playbackStartedAtRef.current = shouldResetPlaybackStart ? null : Date.now();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setHasAcknowledgedLegacyWarning(false);
    setHasPlaybackEnded(false);
    setIsPlaybackActive(false);
    playbackStartedAtRef.current = null;
  }, [episode?.id, isOpen]);

  const shouldShowLegacyWarning =
    Boolean(episode?.requiresLegacyWarning) && !hasAcknowledgedLegacyWarning;

  useEffect(() => {
    if (!isPlaybackActive) {
      return undefined;
    }

    const usageIntervalId = window.setInterval(() => {
      reportPlaybackUsage(false);
    }, 15_000);

    return () => {
      window.clearInterval(usageIntervalId);
    };
  }, [isPlaybackActive, onPlaybackUsageTracked]);

  useEffect(() => {
    if (!isOpen || !episode || shouldShowLegacyWarning || !iframeRef.current) {
      return undefined;
    }

    const player = new playerjs.Player(iframeRef.current);
    const handleEnded = async () => {
      await exitFullscreenIfActive();
      reportPlaybackUsage(true);
      setIsPlaybackActive(false);
      setHasPlaybackEnded(true);
    };
    const handlePlay = () => {
      if (playbackStartedAtRef.current === null) {
        playbackStartedAtRef.current = Date.now();
      }
      setIsPlaybackActive(true);
      setHasPlaybackEnded(false);
    };
    const handlePause = () => {
      reportPlaybackUsage(true);
      setIsPlaybackActive(false);
    };

    player.on('ended', handleEnded);
    player.on('play', handlePlay);
    player.on('pause', handlePause);

    return () => {
      reportPlaybackUsage(true);
      setIsPlaybackActive(false);
      player.off('ended', handleEnded);
      player.off('play', handlePlay);
      player.off('pause', handlePause);
    };
  }, [episode, isOpen, onPlaybackUsageTracked, shouldShowLegacyWarning]);

  return (
    <AnimatePresence>
      {isOpen && episode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm px-3 md:px-6 py-3 md:py-6 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-5xl max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-3rem)] rounded-2xl overflow-hidden border border-white/10 bg-editorial-bg shadow-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-4 md:px-6 py-4 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase text-editorial-red">
                  {episode.seriesTitle}
                </p>
                <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight italic truncate">
                  {episode.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Close player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shouldShowLegacyWarning ? (
              <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 overflow-y-auto">
                <div className="rounded-2xl border border-editorial-red/40 bg-editorial-red/10 p-5 md:p-6">
                  <h3 className="text-sm md:text-base font-black uppercase tracking-[0.3em] text-editorial-red mb-3">
                    Old Content
                  </h3>
                  <p className="text-base md:text-lg text-white leading-relaxed">
                    {LEGACY_WARNING_MESSAGE}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setHasAcknowledgedLegacyWarning(true)}
                    className="inline-flex items-center justify-center bg-white text-black px-6 py-3 rounded font-bold hover:bg-white/90 transition-all"
                  >
                    Watch Anyway
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center bg-white/10 text-white px-6 py-3 rounded font-bold hover:bg-white/15 transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-black flex-none">
                <iframe
                  ref={iframeRef}
                  src={buildAutoplayUrl(episode.playbackUrl, episode.id)}
                  title={episode.title}
                  className="w-full aspect-video max-h-[50vh] md:max-h-[60vh]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {hasPlaybackEnded && nextEpisode && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center p-6">
                    <button
                      type="button"
                      onClick={() => onWatchNext(nextEpisode)}
                      className="inline-flex items-center justify-center bg-white text-black px-6 py-3 rounded font-bold hover:bg-white/90 transition-all shadow-xl text-sm sm:text-base"
                    >
                      Watch Next Episode
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="px-4 md:px-6 py-4 space-y-2 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">
                <span>{episode.seriesTitle}</span>
                <span>{Math.max(1, Math.round(episode.durationInSeconds / 60))} min</span>
                <span>{new Date(episode.publishedAt).getFullYear()}</span>
              </div>
              {episode.description && (
                <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                  {episode.description}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
