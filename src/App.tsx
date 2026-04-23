import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useVenues } from './hooks/useVenues';
import { AdminLogin } from './components/AdminLogin';
import { CreateVenueModal } from './components/CreateVenueModal';
import { VenueCard } from './components/VenueCard';
import { VenueDetail } from './components/VenueDetail';
import { GateCheck } from './components/GateCheck';
import { InvitePage } from './components/InvitePage';
import { TreePine, Plus, LogOut, Loader2 } from 'lucide-react';
import type { Venue } from './types';

type View = 'dashboard' | 'venue-detail' | 'gate-check';

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { venues, loading: venuesLoading, createVenue, deleteVenue } = useVenues(user?.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [view, setView] = useState<View>('dashboard');

  // Check if we're on an invite route
  const path = window.location.pathname;
  const inviteMatch = path.match(/^\/invite\/(.+)$/);
  if (inviteMatch) {
    return <InvitePage code={inviteMatch[1]} />;
  }

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ink-400" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <AdminLogin onLogin={signIn} onSignUp={signUp} />;
  }

  // Gate Check view
  if (view === 'gate-check' && selectedVenue) {
    return (
      <GateCheck
        venue={selectedVenue}
        onBack={() => setView('venue-detail')}
      />
    );
  }

  // Venue detail view
  if (view === 'venue-detail' && selectedVenue) {
    return (
      <VenueDetail
        venue={selectedVenue}
        onBack={() => {
          setSelectedVenue(null);
          setView('dashboard');
        }}
        onDelete={async () => {
          await deleteVenue(selectedVenue.id);
          setSelectedVenue(null);
          setView('dashboard');
        }}
        onGateCheck={() => setView('gate-check')}
      />
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
              <TreePine size={18} className="text-brand-500" />
            </div>
            <span className="text-ink-900 text-lg font-bold tracking-tight">Referral Tree</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-500 hidden sm:block">{user.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-ink-600 hover:text-brand-500 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Your venues</h1>
            <p className="text-ink-600 mt-1">Manage your venues and track referrals.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-button hover:shadow-card-hover"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New venue</span>
          </button>
        </div>

        {venuesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ink-400" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TreePine size={28} className="text-ink-400" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900 mb-2">No venues yet</h3>
            <p className="text-ink-600 mb-6 max-w-sm mx-auto">
              Create your first venue to start generating referral links and growing your network.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200"
            >
              <Plus size={18} />
              Create your first venue
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onClick={() => {
                  setSelectedVenue(venue);
                  setView('venue-detail');
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create venue modal */}
      {showCreateModal && (
        <CreateVenueModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, description, imageUrl) => {
            await createVenue(name, description, imageUrl);
          }}
        />
      )}
    </div>
  );
}

export default App;
