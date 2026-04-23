import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus } from 'lucide-react';
import { Episode, Series } from '../types';
import { motion } from 'motion/react';

type RowItem = Series | Episode;

interface MovieRowProps {
  title: string;
  items: RowItem[];
  onSelectItem?: (item: RowItem) => void;
  onPlayItem?: (item: RowItem) => void;
}

function buildMetadataItems(item: RowItem): string[] {
  if (item.kind === 'series') {
    return [
      `${item.episodeCount} ${item.episodeCount === 1 ? 'Episode' : 'Episodes'}`,
      item.updatedAt ? new Date(item.updatedAt).getFullYear().toString() : '',
    ].filter(Boolean);
  }

  const durationInMinutes = Math.max(1, Math.round(item.durationInSeconds / 60));
  return [item.seriesTitle, `${durationInMinutes} min`].filter(Boolean);
}

export default function MovieRow({ title, items, onSelectItem, onPlayItem }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 mb-12 md:mb-16 relative group">
      <div className="flex items-center gap-3 px-4 md:px-12">
        <div className="w-[3px] h-6 bg-editorial-red" />
        <h3 className="text-xl md:text-2xl font-bold tracking-tight cursor-pointer">
          {title}
        </h3>
      </div>

      <div className="relative">
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-40 bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity w-14 hidden md:flex items-center justify-center cursor-pointer border-r border-white/5"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>

        <div 
          ref={rowRef}
          className="flex gap-4 px-4 md:px-12 overflow-x-scroll no-scrollbar scroll-smooth pt-2 pb-4"
        >
          {items.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.05 }}
              className="relative flex-none w-[200px] md:w-[320px] aspect-video group/card cursor-pointer rounded-md overflow-hidden bg-gray-900 ring-1 ring-white/10 hover:ring-editorial-red transition-all duration-300 shadow-2xl"
              onClick={() => onSelectItem?.(item)}
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-all duration-700 group-hover/card:scale-110 group-hover/card:brightness-50"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-editorial-bg to-black" />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-editorial-bg via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-5">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onPlayItem?.(item);
                    }}
                    className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-transform hover:scale-110 active:scale-95 shadow-lg"
                    type="button"
                  >
                    <Play className="fill-current w-4 h-4 ml-0.5" />
                  </button>
                  <div className="w-9 h-9 rounded-full border border-white/40 bg-black/20 backdrop-blur-sm flex items-center justify-center hover:border-white transition-all hover:bg-black/40">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-editorial-red uppercase tracking-widest">
                    {item.kind === 'series' ? 'Series' : 'Episode'}
                  </p>
                  <h4 className="text-sm font-bold truncate text-white uppercase tracking-tighter italic">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {buildMetadataItems(item).map((metadataItem) => (
                      <span key={metadataItem} className="border border-white/20 px-1 py-0">
                        {metadataItem}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-40 bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity w-14 hidden md:flex items-center justify-center cursor-pointer border-l border-white/5"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>
    </div>
  );
}
