'use client';

import { useState, useEffect } from 'react';

interface FingerprintData {
  fingerprint: string | null;
  isVpn: boolean;
  isEmulator: boolean;
  isTor: boolean;
  loading: boolean;
}

export function useFingerprint(): FingerprintData {
  const [data, setData] = useState<FingerprintData>({
    fingerprint: null,
    isVpn: false,
    isEmulator: false,
    isTor: false,
    loading: true,
  });

  useEffect(() => {
    async function loadFingerprint() {
      const apiKey = process.env.NEXT_PUBLIC_FINGERPRINT_API_KEY;
      
      if (!apiKey) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const FingerprintJS = await import('@fingerprintjs/fingerprintjs-pro');
        const fpPromise = FingerprintJS.load({ apiKey });
        const fp = await fpPromise;
        const result = await fp.get();

        setData({
          fingerprint: result.visitorId,
          isVpn: (result as any).vpn?.result || false,
          isEmulator: (result as any).emulator?.result || false,
          isTor: (result as any).tor?.result || false,
          loading: false,
        });
      } catch (error) {
        console.error('[FingerprintJS] Error loading data:', error);
        setData({
          fingerprint: null,
          isVpn: false,
          isEmulator: false,
          isTor: false,
          loading: false,
        });
      }
    }

    loadFingerprint();
  }, []);

  return data;
}
