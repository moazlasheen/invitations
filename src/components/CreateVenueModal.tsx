import React, { useState } from 'react';
import { X, Building2, FileText, Image, AlertCircle } from 'lucide-react';

interface CreateVenueModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string, imageUrl: string) => Promise<void>;
}

export function CreateVenueModal({ onClose, onCreate }: CreateVenueModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Venue name is required.');
      return;
    }

    setLoading(true);
    try {
      await onCreate(name, description, imageUrl);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create venue. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-card-hover w-full max-w-lg p-8 animate-in">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-ink-100 hover:bg-ink-200 transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-ink-600" />
        </button>

        <h2 className="text-2xl font-bold text-ink-900 mb-1">Create a new venue</h2>
        <p className="text-ink-600 text-sm mb-6">Add your business or place to start generating referral links.</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="venue-name" className="block text-sm font-medium text-ink-800 mb-2">
              Venue name
            </label>
            <div className="relative">
              <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="venue-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Grand Café"
                required
                className="w-full pl-11 pr-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="venue-desc" className="block text-sm font-medium text-ink-800 mb-2">
              Description
            </label>
            <div className="relative">
              <FileText size={18} className="absolute left-4 top-4 text-ink-400" />
              <textarea
                id="venue-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people about this place..."
                rows={3}
                className="w-full pl-11 pr-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="venue-img" className="block text-sm font-medium text-ink-800 mb-2">
              Image URL <span className="text-ink-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Image size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="venue-img"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.pexels.com/..."
                className="w-full pl-11 pr-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 rounded-xl border border-ink-200 text-ink-800 font-medium hover:bg-ink-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 rounded-xl bg-ink-900 hover:bg-brand-500 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create venue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
