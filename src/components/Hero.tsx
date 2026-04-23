import React from 'react';
import { Play, Info } from 'lucide-react';
import { Series } from '../types';
import { motion } from 'motion/react';

interface HeroProps {
  series: Series;
  onPlay?: () => void;
  onBrowseCatalog?: () => void;
}

export default function Hero({ series, onPlay, onBrowseCatalog }: HeroProps) {
  const metadataItems = [
    `${series.episodeCount} ${series.episodeCount === 1 ? 'Episode' : 'Episodes'}`,
    series.updatedAt ? new Date(series.updatedAt).getFullYear().toString() : undefined,
  ].filter(Boolean);
  const isLongTitle = series.title.length > 28;
  const titleClassName = isLongTitle
    ? 'max-w-[12ch] text-[clamp(2.5rem,8vw,4.5rem)]'
    : 'max-w-[14ch] text-[clamp(2.8rem,10vw,5rem)]';

  return (
    <header className="relative h-[85vh] md:h-[95vh] w-full overflow-hidden flex flex-col justify-end">
      {/* Background Image with Overlays */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-editorial-bg via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-editorial-bg/80 via-editorial-bg/20 to-transparent" />
      </div>

      {/* Large Background Text for depth */}
      <div className="absolute inset-0 flex items-center justify-center text-[20vw] font-black text-white/5 tracking-tighter select-none pointer-events-none z-0">
        ORIGINAL
      </div>

      <div className="relative z-20 h-full flex flex-col justify-end px-6 md:px-12 pb-24 md:pb-32 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-1.5 py-0.5 bg-editorial-red text-[10px] font-black tracking-widest uppercase rounded-sm">
              Series
            </span>
            <span className="text-[10px] sm:text-sm font-bold tracking-[2px] sm:tracking-[4px] uppercase text-gray-400">
              GiantessTimeFlix Library
            </span>
          </div>

          <h2
            className={`${titleClassName} font-black italic tracking-tighter leading-[0.9] uppercase break-words`}
          >
            {series.title}
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-8 max-w-md font-medium leading-tight">
            {series.description}
          </p>

          {metadataItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              {metadataItems.map((metadataItem) => (
                <span key={metadataItem}>{metadataItem}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              onClick={onPlay}
              className="flex items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded font-bold hover:bg-white/90 transition-all shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!onPlay}
            >
              <Play className="fill-current w-4 h-4 sm:w-5 sm:h-5" /> Play Now
            </button>
            <button
              onClick={onBrowseCatalog}
              className="flex items-center justify-center gap-2 bg-gray-500/50 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded font-bold hover:bg-gray-500/40 transition-all backdrop-blur-md text-sm sm:text-base"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5" /> More Info
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Vignette */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-editorial-bg to-transparent" />
    </header>
  );
}
