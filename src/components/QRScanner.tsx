import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  scanning: boolean;
}

export function QRScanner({ onScan, scanning }: QRScannerProps) {
  const [status, setStatus] = useState<'initializing' | 'running' | 'error' | 'permission-denied'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  const stableOnScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (
      decodedText === lastScannedRef.current &&
      now - lastScannedTimeRef.current < 3000
    ) {
      return;
    }
    lastScannedRef.current = decodedText;
    lastScannedTimeRef.current = now;
    onScan(decodedText);
  }, [onScan]);

  useEffect(() => {
    if (!scanning) return;

    const elementId = 'qr-reader-region';
    let html5QrCode: Html5Qrcode | null = null;
    let cancelled = false;

    const startScanner = async () => {
      try {
        if (cancelled) return;
        setStatus('initializing');
        setErrorMessage('');

        // Make sure the container is clean before starting
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '';

        html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        if (cancelled) {
          html5QrCode.clear();
          return;
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(minDimension * 0.75);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          stableOnScan,
          () => {}
        );

        if (cancelled) {
          // Cleanup if component unmounted during async start
          if (html5QrCode.isScanning) {
            await html5QrCode.stop().catch(() => {});
          }
          html5QrCode.clear();
          return;
        }

        setStatus('running');
      } catch (err: any) {
        console.error('QR Scanner error:', err);
        if (cancelled) return;

        if (
          err?.toString().includes('NotAllowedError') ||
          err?.toString().includes('Permission')
        ) {
          setStatus('permission-denied');
          setErrorMessage('Camera permission was denied. Please allow camera access and try again.');
        } else {
          setStatus('error');
          setErrorMessage(err?.message || 'Failed to start camera.');
        }
      }
    };

    // Small delay to ensure DOM element exists after render
    const timer = setTimeout(startScanner, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);

      const cleanup = async () => {
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
          } catch (_) {}
          try {
            html5QrCode.clear();
          } catch (_) {}
        }
        // Clean up any leftover DOM content
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = '';
      };

      cleanup();
    };
  }, [scanning, stableOnScan]);

  if (!scanning) return null;

  return (
    <div className="relative w-full">
      {/* Scanner viewport — html5-qrcode renders inside this div */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 qr-scanner-wrapper">
        <div id="qr-reader-region" />

        {/* Overlay states */}
        {status === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 z-10">
            <Loader2 size={32} className="animate-spin text-white mb-3" />
            <p className="text-white/80 text-sm font-medium">Starting camera…</p>
          </div>
        )}

        {status === 'permission-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 z-10 p-6">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <CameraOff size={28} className="text-white/60" />
            </div>
            <p className="text-white font-semibold text-center mb-2">Camera access denied</p>
            <p className="text-white/60 text-sm text-center max-w-xs">{errorMessage}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 z-10 p-6">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <CameraOff size={28} className="text-white/60" />
            </div>
            <p className="text-white font-semibold text-center mb-2">Camera error</p>
            <p className="text-white/60 text-sm text-center max-w-xs">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Scanning indicator */}
      {status === 'running' && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
          </span>
          <p className="text-sm text-ink-600 font-medium">Scanning — point camera at QR code</p>
        </div>
      )}
    </div>
  );
}
