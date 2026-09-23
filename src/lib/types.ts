export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  duration?: number;
  uri?: string;
  size?: number;
  hue: number;
  favorite: boolean;
  addedAt: number;
  playCount: number;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  coverHue?: number;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type RepeatMode = 'off' | 'all' | 'one';

export type LibraryData = {
  tracks: Track[];
  playlists: Playlist[];
};

export type SmartCollection = {
  id: string;
  title: string;
  subtitle: string;
  hint?: string;
  hue: number;
};

export type Genre = {
  slug: string;
  name: string;
  tagline: string;
  hue: number;
  keywords: string[];
};