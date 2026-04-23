import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import Footer from './components/Footer';
import SeriesDetail from './components/SeriesDetail';
import VideoPlayerModal from './components/VideoPlayerModal';
import AccessRequiredModal from './components/AccessRequiredModal';
import { AppView, AuthSession, CatalogResponse, Episode, Series } from './types';
import { buildApiUrl } from './api';
import { motion, AnimatePresence } from 'motion/react';

const MAX_HOME_SERIES = 12;
const MAX_HOME_EPISODES = 12;
const RANDOM_HOME_COLLECTION_COUNT = 3;

const EMPTY_AUTH_SESSION: AuthSession = {
  hasFullAccess: false,
  isAuthenticated: false,
  user: null,
};

async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch(buildApiUrl('/api/series'), {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  const catalogResponse = (await response.json()) as CatalogResponse;
  if (
    !Array.isArray(catalogResponse.series) ||
    !Array.isArray(catalogResponse.trailers) ||
    !Array.isArray(catalogResponse.latestEpisodes)
  ) {
    throw new Error('Catalog response has an unexpected format.');
  }

  return catalogResponse;
}

async function fetchAuthSession(): Promise<AuthSession> {
  const response = await fetch(buildApiUrl('/api/auth/session'), {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Auth session request failed with status ${response.status}`);
  }

  return (await response.json()) as AuthSession;
}

function renderCenteredMessage(title: string, description: string) {
  return (
    <div className="pt-32 min-h-screen px-4 md:px-12 pb-12 flex items-center justify-center">
      <div className="max-w-xl text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic">
          {title}
        </h2>
        {description && (
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

function isSeriesItem(item: Series | Episode): item is Series {
  return item.kind === 'series';
}

function shuffleSeries(items: Series[]): Series[] {
  const shuffledItems = [...items];

  for (let currentIndex = shuffledItems.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [shuffledItems[currentIndex], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[currentIndex],
    ];
  }

  return shuffledItems;
}

function EpisodeGrid({
  episodes,
  onPlayEpisode,
}: {
  episodes: Episode[];
  onPlayEpisode: (episode: Episode) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
      {episodes.map((episode) => (
        <motion.button
          key={episode.id}
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 cursor-pointer group text-left"
          onClick={() => onPlayEpisode(episode)}
        >
          <div className="relative aspect-video rounded-md overflow-hidden bg-gray-900 border border-white/10 group-hover:border-editorial-red transition-all duration-300">
            {episode.thumbnailUrl ? (
              <img
                src={episode.thumbnailUrl}
                alt={episode.title}
                className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-50 transition-all duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-editorial-bg to-black" />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm group-hover:text-editorial-red transition-colors uppercase tracking-tight italic underline-offset-4 group-hover:underline">
              {episode.title}
            </h3>
            <p className="text-gray-500 text-xs line-clamp-2 mt-1">
              {episode.description || episode.seriesTitle}
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] text-editorial-red font-black uppercase tracking-widest">
                Preview
              </span>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                {episode.seriesTitle}
              </span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [catalogResponse, setCatalogResponse] = useState<CatalogResponse | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession>(EMPTY_AUTH_SESSION);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const catalogSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isDisposed = false;

    async function loadAppData() {
      try {
        setIsCatalogLoading(true);
        setCatalogErrorMessage('');
        const [nextCatalogResponse, nextAuthSession] = await Promise.all([
          fetchCatalog(),
          fetchAuthSession(),
        ]);
        if (!isDisposed) {
          setCatalogResponse(nextCatalogResponse);
          setAuthSession(nextAuthSession);
        }
      } catch (error) {
        if (!isDisposed) {
          console.error('Failed to load catalog', error);
          setCatalogErrorMessage(
            'The Bunny library could not be loaded. Check the API server and your Bunny credentials.',
          );
        }
      } finally {
        if (!isDisposed) {
          setIsCatalogLoading(false);
        }
      }
    }

    loadAppData();

    return () => {
      isDisposed = true;
    };
  }, []);

  const series = catalogResponse?.series ?? [];
  const trailers = catalogResponse?.trailers ?? [];
  const trailerCollectionIds = useMemo(() => new Set(trailers.map((collection) => collection.id)), [trailers]);
  const hasFullAccess = authSession.hasFullAccess;
  const allCollections = useMemo(() => [...series, ...trailers], [series, trailers]);
  const featuredSeries = useMemo(() => {
    const catalogSeries = series.length > 0 ? series : trailers;
    if (catalogSeries.length === 0) {
      return null;
    }

    const preferredSeries = catalogSeries.find(
      (seriesItem) => seriesItem.id === catalogResponse?.featuredSeriesId,
    );
    return preferredSeries ?? catalogSeries[0];
  }, [catalogResponse?.featuredSeriesId, series, trailers]);

  const latestEpisodes = (catalogResponse?.latestEpisodes ?? []).slice(0, MAX_HOME_EPISODES);
  const recentlyUpdatedSeries = series.slice(0, MAX_HOME_SERIES);
  const recentlyUpdatedTrailers = trailers.slice(0, MAX_HOME_SERIES);
  const randomHomeCollections = useMemo(() => {
    const eligibleCollections = series.filter((collection) => collection.episodes.length > 0);

    return shuffleSeries(eligibleCollections).slice(0, RANDOM_HOME_COLLECTION_COUNT);
  }, [series]);
  const nextEpisode = useMemo(() => {
    if (!selectedEpisode) {
      return null;
    }

    const matchingCollection = allCollections.find(
      (collection) => collection.id === selectedEpisode.seriesId,
    );
    if (!matchingCollection) {
      return null;
    }

    const currentEpisodeIndex = matchingCollection.episodes.findIndex(
      (episode) => episode.id === selectedEpisode.id,
    );
    if (currentEpisodeIndex === -1) {
      return null;
    }

    return matchingCollection.episodes[currentEpisodeIndex + 1] ?? null;
  }, [allCollections, selectedEpisode]);

  const openCatalogSection = () => {
    catalogSectionRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  const openPatreonLogin = () => {
    window.location.href = buildApiUrl('/api/auth/patreon/login');
  };

  const logoutFromPatreon = async () => {
    await fetch(buildApiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    setAuthSession(EMPTY_AUTH_SESSION);
    setSelectedSeries(null);
    setSelectedEpisode(null);
    setCurrentView('home');
    const nextCatalogResponse = await fetchCatalog();
    setCatalogResponse(nextCatalogResponse);
  };

  const openAccessModal = () => {
    setIsAccessModalOpen(true);
  };

  const canAccessItem = (item: Series | Episode): boolean =>
    hasFullAccess || (item.kind === 'episode' && trailerCollectionIds.has(item.seriesId));

  const openSeriesDetail = (seriesItem: Series) => {
    setSelectedSeries(seriesItem);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const openEpisodePlayer = (episode: Episode) => {
    if (!canAccessItem(episode)) {
      openAccessModal();
      return;
    }

    setSelectedEpisode(episode);
  };

  const handleSelectRowItem = (item: Series | Episode) => {
    if (isSeriesItem(item)) {
      openSeriesDetail(item);
      return;
    }

    openEpisodePlayer(item);
  };

  const handlePlayRowItem = (item: Series | Episode) => {
    if (isSeriesItem(item)) {
      if (item.episodes[0]) {
        openEpisodePlayer(item.episodes[0]);
      }
      return;
    }

    openEpisodePlayer(item);
  };

  const renderCatalogView = () => {
    if (isCatalogLoading) {
      return renderCenteredMessage('Loading Library', '');
    }

    if (catalogErrorMessage) {
      return renderCenteredMessage('Catalog Error', catalogErrorMessage);
    }

    if (series.length === 0 && trailers.length === 0) {
      return renderCenteredMessage(
        'No Content Found',
        'Your Bunny library is connected, but no collections with videos were returned yet.',
      );
    }

    switch (currentView) {
      case 'home':
        return (
          <>
            {featuredSeries && (
              <Hero
                series={featuredSeries}
                onPlay={featuredSeries.episodes[0] ? () => openEpisodePlayer(featuredSeries.episodes[0]) : undefined}
                onBrowseCatalog={() => openSeriesDetail(featuredSeries)}
              />
            )}
            <div
              ref={catalogSectionRef}
              className="-mt-16 sm:-mt-32 relative z-20 space-y-6 sm:space-y-8 pb-12"
            >
              <MovieRow
                title="Series Library"
                items={recentlyUpdatedSeries}
                onSelectItem={handleSelectRowItem}
                onPlayItem={handlePlayRowItem}
              />
              {trailers.length > 0 && (
                <MovieRow
                  title="Trailers"
                  items={recentlyUpdatedTrailers}
                  onSelectItem={handleSelectRowItem}
                  onPlayItem={handlePlayRowItem}
                />
              )}
              {randomHomeCollections.map((collection) => (
                <div key={collection.id}>
                  <MovieRow
                    title={collection.title}
                    items={collection.episodes}
                    onSelectItem={handleSelectRowItem}
                    onPlayItem={handlePlayRowItem}
                  />
                </div>
              ))}
              <div className="px-4 md:px-12 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('series')}
                  className="inline-flex items-center justify-center bg-white text-black px-6 sm:px-8 py-3 rounded font-bold hover:bg-white/90 transition-all shadow-xl text-sm sm:text-base"
                >
                  Watch All the Series
                </button>
              </div>
            </div>
          </>
        );
      case 'trailers':
        return (
          <div className="pt-24 min-h-screen px-4 md:px-12 pb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic">
              Library <span className="text-editorial-red">Trailers</span>
            </h2>
            <MovieRow
              title="Trailer Collections"
              items={recentlyUpdatedTrailers}
              onSelectItem={handleSelectRowItem}
              onPlayItem={handlePlayRowItem}
            />
            {trailers.length === 0 && (
              <p className="text-gray-500 text-center py-20">No trailer collections available yet.</p>
            )}
          </div>
        );
      case 'series':
        return (
          <div className="pt-24 min-h-screen px-4 md:px-12 pb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic">
              Library <span className="text-editorial-red">Series</span>
            </h2>
            <MovieRow
              title="All Collections"
              items={series}
              onSelectItem={handleSelectRowItem}
              onPlayItem={handlePlayRowItem}
            />
          </div>
        );
      case 'movies':
        return (
          <div className="pt-24 min-h-screen px-4 md:px-12 pb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic">
              Recently Updated <span className="text-editorial-red">Series</span>
            </h2>
            <MovieRow
              title="Fresh from Bunny"
              items={recentlyUpdatedSeries}
              onSelectItem={handleSelectRowItem}
              onPlayItem={handlePlayRowItem}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-editorial-bg min-h-screen w-full selection:bg-editorial-red selection:text-white">
      <Navbar
        currentView={currentView}
        authSession={authSession}
        searchableSeries={series}
        onOpenSeries={openSeriesDetail}
        onLogin={openPatreonLogin}
        onLogout={() => {
          void logoutFromPatreon();
        }}
        setView={(nextView) => {
          setSelectedSeries(null);
          setCurrentView(nextView);
        }}
      />

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSeries ? `series-${selectedSeries.id}` : currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {selectedSeries ? (
              <SeriesDetail
                series={selectedSeries}
                onBack={() => setSelectedSeries(null)}
                onPlayEpisode={openEpisodePlayer}
              />
            ) : (
              renderCatalogView()
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <VideoPlayerModal
        episode={selectedEpisode}
        isOpen={selectedEpisode !== null}
        nextEpisode={nextEpisode}
        onWatchNext={(episode) => setSelectedEpisode(episode)}
        onClose={() => setSelectedEpisode(null)}
      />
      <AccessRequiredModal
        isOpen={isAccessModalOpen}
        authSession={authSession}
        onClose={() => setIsAccessModalOpen(false)}
        onLogin={openPatreonLogin}
        onWatchFreeContent={() => {
          setIsAccessModalOpen(false);
          setSelectedSeries(null);
          setCurrentView('trailers');
        }}
      />
    </div>
  );
}
