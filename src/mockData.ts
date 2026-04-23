import { VideoContent } from './types';

export const mockContent: VideoContent[] = [
  {
    id: '1',
    title: 'The Great Arrival',
    description: 'When horizons shift and the world looks up, a new era of mystery begins. Experience the scale of a lifetime.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1080&auto=format&fit=crop',
    category: 'Trending Now',
    isSeries: true,
    year: '2024',
    rating: 'TV-MA',
    genres: ['Fantasy', 'Drama']
  },
  {
    id: '2',
    title: 'City Walkers',
    description: 'The skyscrapers are but shadows in their path. A journey through the urban jungle from a perspective never seen before.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1080&auto=format&fit=crop',
    category: 'Trending Now',
    isSeries: false,
    year: '2023',
    rating: 'PG-13',
    genres: ['Action', 'Thriller']
  },
  {
    id: '3',
    title: 'Heights of Wonder',
    description: 'A deep dive into the myths and legends of the colossal beings that once ruled the skies.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1080&auto=format&fit=crop',
    category: 'New Releases',
    isSeries: true,
    year: '2024',
    rating: 'TV-14',
    genres: ['Documentary', 'Fantasy']
  },
  {
    id: '4',
    title: 'The Shadow Above',
    description: 'When the sun vanishes at noon, the city realizes the truth about the legends.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1080&auto=format&fit=crop',
    category: 'New Releases',
    isSeries: false,
    year: '2024',
    rating: 'R',
    genres: ['Horror', 'Sci-Fi']
  },
  {
    id: 't1',
    title: 'Dawn of Titans - Trailer',
    description: 'Official trailer for the upcoming epic saga. Coming late 2025.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1080&auto=format&fit=crop',
    category: 'Trailers',
    isSeries: false,
    isTrailer: true,
    year: '2025',
    rating: 'NR',
    genres: ['Trailers', 'Epic']
  },
  {
    id: 't2',
    title: 'Cloud Walkers Teaser',
    description: 'A brief look at the scale of the upcoming series.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1475924156734-496f8ca6b245?q=80&w=1080&auto=format&fit=crop',
    category: 'Trailers',
    isSeries: true,
    isTrailer: true,
    year: '2024',
    rating: 'NR',
    genres: ['Teasers']
  }
];

export const heroMovie = mockContent[0];
