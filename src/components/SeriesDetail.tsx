import React from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { Episode, Series } from '../types';
import { motion } from 'motion/react';

interface SeriesDetailProps {
  series: Series;
  onBack: () => void;
  onPlayEpisode: (episode: Episode) => void;
}

function formatEpisodeDuration(durationInSeconds: number): string {
  return `${Math.max(1, Math.round(durationInSeconds / 60))} min`;
}

export default function SeriesDetail({
  series,
  onBack,
  onPlayEpisode,
}: SeriesDetailProps) {
  return (
    <div className="pt-24 min-h-screen">
      <div className="relative min-h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          {series.thumbnailUrl ? (
            <img
              src={series.thumbnailUrl}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-editorial-bg to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-editorial-bg via-editorial-bg/60 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-editorial-bg via-editorial-bg/30 to-transparent" />
        </div>

        <div className="relative z-10 px-4 md:px-12 py-8 md:py-12 max-w-4xl space-y-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs md:text-sm uppercase tracking-[0.25em] font-black text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to catalog
          </button>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">
              <span className="px-2 py-1 rounded bg-editorial-red text-white">Series</span>
              <span className="text-gray-300">
                {series.episodeCount} {series.episodeCount === 1 ? 'Episode' : 'Episodes'}
              </span>
              {series.updatedAt && (
                <span className="text-gray-400">
                  Updated {new Date(series.updatedAt).getFullYear()}
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
              {series.title}
            </h1>

            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
              {series.description}
            </p>

            {series.episodes[0] && (
              <button
                type="button"
                onClick={() => onPlayEpisode(series.episodes[0])}
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded font-bold hover:bg-white/90 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Play first episode
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-12 py-10 md:py-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[3px] h-6 bg-editorial-red" />
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
            Episodes
          </h2>
        </div>

        <div className="space-y-4">
          {series.episodes.map((episode, episodeIndex) => (
            <motion.button
              key={episode.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(episodeIndex * 0.03, 0.24) }}
              onClick={() => onPlayEpisode(episode)}
              className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:border-editorial-red/60 hover:bg-white/[0.05] transition-colors overflow-hidden"
            >
              <div className="grid md:grid-cols-[240px_1fr_auto] items-stretch">
                <div className="relative aspect-video md:aspect-auto bg-black">
                  {episode.thumbnailUrl ? (
                    <img
                      src={episode.thumbnailUrl}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-editorial-bg to-black" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="p-5 md:p-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-xs uppercase tracking-[0.25em] font-black text-gray-400">
                    <span>Episode {episodeIndex + 1}</span>
                    <span>{formatEpisodeDuration(episode.durationInSeconds)}</span>
                    <span>{new Date(episode.publishedAt).getFullYear()}</span>
                  </div>

                  <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight italic">
                    {episode.title}
                  </h3>

                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    {episode.description || 'No description available for this episode yet.'}
                  </p>
                </div>

                <div className="px-5 pb-5 md:px-6 md:py-6 flex md:items-center md:justify-center">
                  <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white">
                    <Play className="w-4 h-4 fill-current" />
                    Play
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
