import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Share2, Users, TreePine, BarChart3, ScanLine, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateReferralCode } from '../lib/utils';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ReferralTree } from './ReferralTree';
import { LoadingSpinner } from './LoadingSpinner';
import type { Venue, Referral } from '../types';

interface VenueDetailProps {
  venue: Venue;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onGateCheck: () => void;
}

function buildTree(referrals: Referral[]): Referral[] {
  const map = new Map<string, Referral>();
  const roots: Referral[] = [];

  referrals.forEach((r) => {
    map.set(r.id, { ...r, children: [] });
  });

  map.forEach((r) => {
    if (r.referred_by && map.has(r.referred_by)) {
      map.get(r.referred_by)!.children!.push(r);
    } else {
      roots.push(r);
    }
  });

  return roots;
}

function countAll(referrals: Referral[]): { total: number; accepted: number } {
  let total = 0;
  let accepted = 0;
  referrals.forEach((r) => {
    total++;
    if (r.accepted) accepted++;
  });
  return { total, accepted };
}

export function VenueDetail({ venue, onBack, onDelete, onGateCheck }: VenueDetailProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [adminReferral, setAdminReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'link'>('tree');

  const fetchReferrals = useCallback(async () => {
    const { data } = await supabase
      .from('referrals')
      .select('*')
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: true });

    if (data) {
      setReferrals(data);
      const admin = data.find((r) => r.referred_by === null);
      if (admin) {
        setAdminReferral(admin);
      }
    }
    setLoading(false);
  }, [venue.id]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const createAdminReferral = async () => {
    const code = generateReferralCode();
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        venue_id: venue.id,
        referrer_name: 'Admin',
        referral_code: code,
        referred_by: null,
        accepted: true,
      })
      .select()
      .single();

    if (!error && data) {
      setAdminReferral(data);
      fetchReferrals();
    }
  };

  const tree = buildTree(referrals);
  const stats = countAll(referrals);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={16} className="text-ink-700" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-ink-900 truncate">{venue.name}</h1>
              {venue.description && (
                <p className="text-xs text-ink-500 truncate">{venue.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGateCheck}
              className="flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 text-sm"
            >
              <ScanLine size={16} />
              <span className="hidden sm:inline">Gate Check</span>
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-full bg-ink-100 hover:bg-red-50 flex items-center justify-center transition-colors group"
              aria-label="Delete venue"
            >
              <Trash2 size={15} className="text-ink-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                <Users size={16} className="text-brand-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink-900">{stats.total}</p>
            <p className="text-xs text-ink-500 mt-0.5">Total referrals</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart3 size={16} className="text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink-900">{stats.accepted}</p>
            <p className="text-xs text-ink-500 mt-0.5">Accepted</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <TreePine size={16} className="text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink-900">{stats.total - stats.accepted}</p>
            <p className="text-xs text-ink-500 mt-0.5">Pending</p>
          </div>
        </div>

        {/* Admin referral link */}
        {!adminReferral ? (
          <div className="bg-white rounded-3xl shadow-card p-8 text-center mb-8">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 size={24} className="text-brand-500" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 mb-2">Generate your referral link</h3>
            <p className="text-sm text-ink-600 mb-6 max-w-sm mx-auto">
              Create your admin referral link and QR code to start inviting people to {venue.name}.
            </p>
            <button
              onClick={createAdminReferral}
              className="inline-flex items-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200"
            >
              <Share2 size={16} />
              Generate link
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <QRCodeDisplay code={adminReferral.referral_code} label="Your admin referral link" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tree'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <TreePine size={15} />
            Referral tree
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'link'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <Share2 size={15} />
            Share link
          </button>
        </div>

        {/* Content */}
        {activeTab === 'tree' ? (
          <div className="bg-white rounded-3xl shadow-card p-6">
            <ReferralTree referrals={tree} />
          </div>
        ) : (
          adminReferral && (
            <div>
              <QRCodeDisplay
                code={adminReferral.referral_code}
                label="Share this link with people you want to refer"
              />
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-800 font-medium">
                  💡 Tip: When someone accepts your referral, they'll get their own unique link and QR
                  code to refer others.
                </p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
