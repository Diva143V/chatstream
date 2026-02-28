import React, { useEffect, useState } from 'react';
import { Search, Zap, Flame, Tag as TagIcon } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  memberCount: number;
  tags: string[];
}

interface DiscoveryData {
  featured: Server[];
  trending: Server[];
  categories: string[];
}

export const ServerDiscovery: React.FC = () => {
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData | null>(null);
  const [searchResults, setSearchResults] = useState<Server[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscoveryData();
  }, []);

  const fetchDiscoveryData = async () => {
    try {
      const res = await fetch('/api/discover');
      const data = await res.json();
      setDiscoveryData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch discovery data:', error);
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/discover/search?${params}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    try {
      const res = await fetch(`/api/discover/category/${category}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Failed to fetch category:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (searchQuery || selectedCategory) {
    return (
      <div className="p-8">
        <button
          onClick={() => {
            setSearchQuery('');
            setSelectedCategory(null);
            setSearchResults([]);
          }}
          className="mb-6 text-blue-500 hover:underline"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Featured Servers */}
      {discoveryData?.featured && discoveryData.featured.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} className="text-yellow-500" />
            <h2 className="text-2xl font-bold">Featured Servers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveryData.featured.map((server) => (
              <ServerCard key={server.id} server={server} featured />
            ))}
          </div>
        </section>
      )}

      {/* Trending Servers */}
      {discoveryData?.trending && discoveryData.trending.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={20} className="text-orange-500" />
            <h2 className="text-2xl font-bold">Trending Servers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveryData.trending.slice(0, 6).map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {discoveryData?.categories && discoveryData.categories.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TagIcon size={20} />
            <h2 className="text-2xl font-bold">Browse by Category</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {discoveryData.categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 dark:from-blue-900/40 dark:to-purple-900/40 dark:hover:from-blue-900/60 dark:hover:to-purple-900/60 rounded-lg transition-all capitalize font-semibold"
              >
                {category}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

interface ServerCardProps {
  server: Server;
  featured?: boolean;
}

const ServerCard: React.FC<ServerCardProps> = ({ server, featured }) => {
  return (
    <div className={`p-4 rounded-lg border transition-all hover:shadow-lg dark:border-gray-700 ${featured ? 'border-yellow-500 bg-yellow-50/5 dark:bg-yellow-900/10' : 'border-gray-200 bg-white dark:bg-gray-800'}`}>
      {/* Server Icon */}
      <div className="mb-4">
        {server.icon ? (
          <img
            src={server.icon}
            alt={server.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {server.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Server Info */}
      <h3 className="font-bold text-lg mb-2 line-clamp-2">{server.name}</h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
        {server.description || 'No description provided'}
      </p>

      {/* Member Count */}
      <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
        {server.memberCount.toLocaleString()} members
      </div>

      {/* Tags */}
      {server.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {server.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-full capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Join Button */}
      <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition">
        Join Server
      </button>
    </div>
  );
};
