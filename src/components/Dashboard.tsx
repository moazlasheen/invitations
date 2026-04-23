import React, { useEffect, useState, useCallback } from 'react';
import { Plus, TreePine, LogOut, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateReferralCode } from '../lib/utils';
import { VenueCard } from './VenueCard';
import { VenueDetail } from './VenueDetail';
import { CreateVenueModal } from './CreateVenueModal';
import { LoadingSpinner } from './LoadingSpinner';
import type { Venue } from '../types';

interface DashboardProps {
  userId: string;
  onSignOut: () => void;
}

export function Dashboard({ userId, onSignOut }: DashboardProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVenues = useCallback(async () => {
    const { data } = await supabase
      .from('venues')
      .select('*')
      .eq('admin_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setVenues(data);

      // Fetch referral counts for each venue
      const counts: Record<string, number> = {};
      for (const venue of data) {
        const { count } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venue.id);
        counts[venue.id] = count || 0;
      }
      setReferralCounts(counts);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleCreateVenue = async (name: string, description: string, imageUrl: string) => {
    const { data: venue, error } = await supabase
      .from('venues')
      .insert({
        admin_id: userId,
        name,
        description,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create admin referral for this venue
    if (venue) {
      const code = generateReferralCode();
      await supabase.from('referrals').insert({
        venue_id: venue.id,
        referrer_name: 'Admin',
        referral_code: code,
        referred_by: null,
        accepted: true,
      });
    }

    fetchVenues();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
              <TreePine size={18} className="text-brand-500" />
            </div>
            <span className="text-lg font-bold text-ink-900 tracking-tight">Referral Tree</span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-ink-600 hover:text-brand-500 transition-colors font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedVenue ? (
          <VenueDetail
            venue={selectedVenue}
            onBack={() => {
              setSelectedVenue(null);
              fetchVenues();
            }}
          />
        ) : (
          <>
            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Your venues</h1>
                <p className="text-ink-600 mt-1">Manage your businesses and referral networks.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-button hover:shadow-card-hover"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">New venue</span>
              </button>
            </div>

            {/* Venue grid */}
            {venues.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-card p-12 text-center">
                <div className="w-20 h-20 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 size={32} className="text-ink-400" />
                </div>
                <h2 className="text-xl font-bold text-ink-900 mb-2">No venues yet</h2>
                <p className="text-ink-600 mb-6 max-w-sm mx-auto">
                  Create your first venue to start generating referral links and growing your network.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200"
                >
                  <Plus size={18} />
                  Create your first venue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    referralCount={referralCounts[venue.id] || 0}
                    onClick={() => setSelectedVenue(venue)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCreateModal && (
        <CreateVenueModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateVenue}
        />
      )}
    </div>
  );
}
