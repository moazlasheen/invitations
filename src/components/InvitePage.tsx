import { useEffect, useState } from 'react';
import { TreePine, Check, AlertCircle, Copy, Download, QrCode, Bookmark, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateReferralCode, getReferralLink } from '../lib/utils';
import { generateQRDataUrl } from '../lib/qr';
import { LoadingSpinner } from './LoadingSpinner';
import type { Venue, Referral } from '../types';

interface InvitePageProps {
  code: string;
}

export function InvitePage({ code }: InvitePageProps) {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newReferral, setNewReferral] = useState<Referral | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function load() {
      // Find the referral by code
      const { data: ref, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', code)
        .single();

      if (refErr || !ref) {
        setError('This referral link is invalid or has expired.');
        setStep('error');
        setLoading(false);
        return;
      }

      setReferral(ref);

      // Fetch the venue
      const { data: ven } = await supabase
        .from('venues')
        .select('*')
        .eq('id', ref.venue_id)
        .single();

      if (ven) setVenue(ven);
      setStep('form');
      setLoading(false);
    }
    load();
  }, [code]);

  const handleAccept = async () => {
    if (!referral || !name.trim()) return;

    setLoading(true);
    const newCode = generateReferralCode();

    const { data, error: insertErr } = await supabase
      .from('referrals')
      .insert({
        venue_id: referral.venue_id,
        referrer_name: name.trim(),
        referrer_email: email.trim(),
        referral_code: newCode,
        referred_by: referral.id,
        accepted: true,
      })
      .select()
      .single();

    if (insertErr) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    if (data) {
      setNewReferral(data);
      const link = getReferralLink(newCode);
      const qr = await generateQRDataUrl(link);
      setQrUrl(qr);
      setStep('success');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!newReferral) return;
    await navigator.clipboard.writeText(getReferralLink(newReferral.referral_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrUrl || !newReferral) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `referral-${newReferral.referral_code}.png`;
    a.click();
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={28} className="text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Invalid link</h1>
          <p className="text-ink-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success' && newReferral) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-lg mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-ink-900 mb-2">You're in!</h1>
            <p className="text-ink-600">
              Welcome to <strong>{venue?.name}</strong>. You've been referred by{' '}
              <strong>{referral?.referrer_name}</strong>.
            </p>
          </div>

          {/* IMPORTANT: Save warning */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <Bookmark size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 mb-1">Save your link & QR code!</p>
                <p className="text-sm text-amber-800">
                  You'll need your referral link or QR code to enter <strong>{venue?.name}</strong>.
                  Bookmark this page, copy the link, or download the QR code below.
                  <strong> You won't be able to recover it later.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-3xl shadow-card p-8 text-center mb-6">
            <p className="text-sm font-medium text-ink-600 mb-4">Your personal QR code</p>
            {qrUrl ? (
              <img src={qrUrl} alt="Your QR Code" className="w-56 h-56 mx-auto rounded-2xl mb-4" />
            ) : (
              <div className="w-56 h-56 mx-auto rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
                <QrCode size={48} className="text-ink-300" />
              </div>
            )}

            {/* Link */}
            <div className="bg-ink-50 rounded-xl p-3 flex items-center gap-2 mb-4">
              <code className="flex-1 text-xs text-ink-700 truncate">
                {getReferralLink(newReferral.referral_code)}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-ink-200 transition-colors flex-shrink-0"
                aria-label="Copy link"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-ink-500" />}
              </button>
            </div>

            <button
              onClick={handleDownloadQR}
              className="flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-brand-500 transition-colors mx-auto"
            >
              <Download size={14} />
              Download QR code
            </button>
          </div>

          {/* Refer others */}
          <div className="bg-ink-900 rounded-3xl p-6 text-center">
            <h3 className="text-white font-bold text-lg mb-2">Refer your friends</h3>
            <p className="text-white/70 text-sm mb-4">
              Share your link with others to invite them to {venue?.name}.
            </p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy your referral link'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="min-h-screen bg-white">
      {/* Hero image */}
      {venue?.image_url && (
        <div className="h-48 sm:h-64 overflow-hidden relative">
          <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <TreePine size={16} className="text-brand-500" />
          </div>
          <span className="text-sm font-bold text-ink-900">Referral Tree</span>
        </div>

        {/* Invitation message */}
        <div className="mb-8">
          <p className="text-sm text-brand-500 font-semibold mb-2 uppercase tracking-wide">You're invited</p>
          <h1 className="text-3xl font-bold text-ink-900 mb-3">
            {referral?.referrer_name} invites you to join{' '}
            <span className="text-brand-500">{venue?.name}</span>
          </h1>
          {venue?.description && (
            <p className="text-ink-600 text-lg">{venue.description}</p>
          )}
        </div>

        {/* Accept form */}
        <div className="bg-white rounded-3xl shadow-card p-6">
          <h2 className="text-lg font-bold text-ink-900 mb-4">Accept this invitation</h2>

          {error && (
            <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="invite-name" className="block text-sm font-medium text-ink-800 mb-1.5">
                Your name <span className="text-brand-500">*</span>
              </label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full px-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-ink-800 mb-1.5">
                Email <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleAccept}
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-brand-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Accept invitation
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-ink-400 text-center mt-6">
          By accepting, you'll receive your own referral link and QR code.
        </p>
      </div>
    </div>
  );
}
