import React, { useEffect, useState } from 'react';
import { generateQRDataUrl } from '../lib/qr';
import { getReferralLink } from '../lib/utils';
import { Copy, Check, Download, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  code: string;
  label?: string;
  compact?: boolean;
}

export function QRCodeDisplay({ code, label, compact = false }: QRCodeDisplayProps) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const link = getReferralLink(code);

  useEffect(() => {
    generateQRDataUrl(link).then(setQrUrl);
  }, [link]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `referral-${code}.png`;
    a.click();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-12 h-12 rounded-lg" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-ink-100 flex items-center justify-center">
            <QrCode size={20} className="text-ink-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-500 truncate font-mono">{code}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-ink-100 transition-colors"
          aria-label="Copy link"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-ink-500" />}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-card p-6">
      {label && <p className="text-sm font-medium text-ink-600 mb-4">{label}</p>}
      <div className="flex flex-col items-center">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-2xl mb-4" />
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
            <QrCode size={48} className="text-ink-300" />
          </div>
        )}
        <div className="w-full bg-ink-50 rounded-xl p-3 flex items-center gap-2 mb-4">
          <code className="flex-1 text-xs text-ink-700 truncate">{link}</code>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-ink-200 transition-colors flex-shrink-0"
            aria-label="Copy link"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-ink-500" />}
          </button>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-brand-500 transition-colors"
        >
          <Download size={14} />
          Download QR code
        </button>
      </div>
    </div>
  );
}
