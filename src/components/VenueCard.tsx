import React from 'react';
import { MapPin, Users, ArrowRight } from 'lucide-react';
import type { Venue } from '../types';
import { formatDate } from '../lib/utils';

interface VenueCardProps {
  venue: Venue;
  referralCount: number;
  onClick: () => void;
}

const defaultImages = [
  'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2034335/pexels-photo-2034335.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=600',
];

export function VenueCard({ venue, referralCount, onClick }: VenueCardProps) {
  const imageUrl = venue.image_url || defaultImages[Math.abs(venue.name.length) % defaultImages.length];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-3xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group"
    >
      <div className="aspect-[16/10] overflow-hidden relative">
        <img
          src={imageUrl}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
          <Users size={13} className="text-ink-600" />
          <span className="text-xs font-semibold text-ink-800">{referralCount} referrals</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-ink-900 truncate">{venue.name}</h3>
            {venue.description && (
              <p className="text-sm text-ink-600 mt-1 line-clamp-2">{venue.description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 text-ink-400">
              <MapPin size={13} />
              <span className="text-xs">Created {formatDate(venue.created_at)}</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-ink-100 group-hover:bg-brand-500 flex items-center justify-center flex-shrink-0 transition-colors">
            <ArrowRight size={16} className="text-ink-500 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </button>
  );
}
