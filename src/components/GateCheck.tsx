import { useState, useCallback } from 'react';
import { ArrowLeft, ShieldCheck, ShieldX, User, Calendar, GitBranch, RotateCcw, ScanLine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QRScanner } from './QRScanner';
import type { Venue, Referral } from '../types';

interface GateCheckProps {
  venue: Venue;
  onBack: () => void;
}

interface ScanResult {
  status: 'valid' | 'invalid' | 'pending';
  referral?: Referral;
  referrerName?: string;
  message: string;
}

export function GateCheck({ venue, onBack }: GateCheckProps) {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const lookupCode = useCallback(async (scannedText: string) => {
    // Extract referral code from URL or raw code
    let code = scannedText.trim();

    // If it's a full URL like https://domain.com/invite/ABC123, extract the code
    const urlMatch = code.match(/\/invite\/([^/?#]+)/);
    if (urlMatch) {
      code = urlMatch[1];
    }

    if (!code) {
      setResult({
        status: 'invalid',
        message: 'Invalid QR code — no referral code found.',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Look up the referral by code + venue
      const { data: referral, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', code)
        .eq('venue_id', venue.id)
        .maybeSingle();

      if (error) throw error;

      if (!referral) {
        setResult({
          status: 'invalid',
          message: 'This code is not recognized for this venue.',
        });
        setLoading(false);
        return;
      }

      if (!referral.accepted) {
        setResult({
          status: 'pending',
          referral,
          message: 'This referral has not been accepted yet.',
        });
        setLoading(false);
        return;
      }

      // Look up who referred them
      let referrerName = 'Direct invite';
      if (referral.referred_by) {
        const { data: referrer } = await supabase
          .from('referrals')
          .select('referrer_name')
          .eq('id', referral.referred_by)
          .maybeSingle();

        if (referrer) {
          referrerName = referrer.referrer_name;
        }
      }

      setResult({
        status: 'valid',
        referral,
        referrerName,
        message: 'Verified — entry approved.',
      });
    } catch (err) {
      console.error('Gate check lookup error:', err);
      setResult({
        status: 'invalid',
        message: 'Something went wrong. Please try scanning again.',
      });
    }

    setLoading(false);
  }, [venue.id]);

  const handleScan = useCallback((decodedText: string) => {
    lookupCode(decodedText);
  }, [lookupCode]);

  const resetScan = () => {
    setResult(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={16} className="text-ink-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ink-900 truncate">Gate Check</h1>
            <p className="text-xs text-ink-500 truncate">{venue.name}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full">
            <ScanLine size={14} />
            <span className="text-xs font-semibold">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Scanner */}
        <QRScanner onScan={handleScan} scanning={scanning} />

        {/* Loading state */}
        {loading && (
          <div className="mt-6 bg-white rounded-2xl shadow-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <ScanLine size={20} className="text-ink-400" />
            </div>
            <p className="text-sm text-ink-600 font-medium">Looking up referral…</p>
          </div>
        )}

        {/* Result card */}
        {result && !loading && (
          <div className="mt-6">
            {/* Status banner */}
            <div
              className={`rounded-2xl shadow-card overflow-hidden ${
                result.status === 'valid'
                  ? 'bg-white ring-2 ring-green-500'
                  : result.status === 'pending'
                  ? 'bg-white ring-2 ring-amber-400'
                  : 'bg-white ring-2 ring-red-400'
              }`}
            >
              {/* Status header */}
              <div
                className={`px-6 py-5 flex items-center gap-4 ${
                  result.status === 'valid'
                    ? 'bg-green-50'
                    : result.status === 'pending'
                    ? 'bg-amber-50'
                    : 'bg-red-50'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    result.status === 'valid'
                      ? 'bg-green-500'
                      : result.status === 'pending'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                >
                  {result.status === 'valid' ? (
                    <ShieldCheck size={28} className="text-white" />
                  ) : (
                    <ShieldX size={28} className="text-white" />
                  )}
                </div>
                <div>
                  <h2
                    className={`text-xl font-bold ${
                      result.status === 'valid'
                        ? 'text-green-800'
                        : result.status === 'pending'
                        ? 'text-amber-800'
                        : 'text-red-800'
                    }`}
                  >
                    {result.status === 'valid'
                      ? 'Valid'
                      : result.status === 'pending'
                      ? 'Pending'
                      : 'Invalid'}
                  </h2>
                  <p
                    className={`text-sm font-medium ${
                      result.status === 'valid'
                        ? 'text-green-700'
                        : result.status === 'pending'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Referral details */}
              {result.referral && (
                <div className="px-6 py-5 space-y-4">
                  {/* Person name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 font-medium">Name</p>
                      <p className="text-base font-semibold text-ink-900">
                        {result.referral.referrer_name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Referred by */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                      <GitBranch size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 font-medium">Referred by</p>
                      <p className="text-base font-semibold text-ink-900">
                        {result.referrerName || (result.referral.referred_by ? 'Unknown' : 'Direct invite (Admin)')}
                      </p>
                    </div>
                  </div>

                  {/* Date accepted */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-500 font-medium">
                        {result.referral.accepted ? 'Accepted on' : 'Created on'}
                      </p>
                      <p className="text-base font-semibold text-ink-900">
                        {new Date(result.referral.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scan next button */}
            <button
              onClick={resetScan}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-button"
            >
              <RotateCcw size={16} />
              Scan next person
            </button>
          </div>
        )}

        {/* Empty state — when scanner is running and no result yet */}
        {!result && !loading && (
          <div className="mt-8 text-center">
            <p className="text-ink-500 text-sm">
              Point the camera at a guest's QR code to verify their referral.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
