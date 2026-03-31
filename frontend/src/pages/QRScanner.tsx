import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

type ScanType = 'attendance_1' | 'attendance_2' | 'refreshment_1' | 'refreshment_2';

interface ScanResult {
  status: 'success' | 'already_scanned' | 'invalid' | 'error';
  message: string;
  teamName?: string;
  teamId?: string;
  leaderName?: string;
  presentMembers?: string[];
}

const SCAN_TYPES: { key: ScanType; label: string; emoji: string; color: string }[] = [
  { key: 'attendance_1',  label: 'Attendance 1',  emoji: '🏃', color: 'blue'   },
  { key: 'attendance_2',  label: 'Attendance 2',  emoji: '🏃', color: 'purple' },
  { key: 'refreshment_1', label: 'Refreshment 1', emoji: '☕', color: 'amber'  },
  { key: 'refreshment_2', label: 'Refreshment 2', emoji: '☕', color: 'emerald'},
];

const COLOR_MAP: Record<string, string> = {
  blue:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  amber:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const ACTIVE_MAP: Record<string, string> = {
  blue:    'bg-blue-500/25 text-blue-300 border-blue-400/50 shadow-[0_0_16px_rgba(59,130,246,0.2)]',
  purple:  'bg-purple-500/25 text-purple-300 border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.2)]',
  amber:   'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.2)]',
  emerald: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
};

const QRScanner: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const navigate = useNavigate();
  const [activeScan, setActiveScan] = useState<ScanType>('attendance_1');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const lastScannedRef = useRef<string>('');
  const processingRef = useRef(false);

  // Auth guard
  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      if (!isModal) { alert('Access Denied'); navigate('/'); }
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      const userDuties = user.duties || [user.duty];
      if (!userDuties.includes('QR Attendance') && !isModal) {
        alert('Access Denied: You are not assigned to QR Attendance duty.');
        navigate('/');
      }
    } catch { localStorage.removeItem('staffUser'); if (!isModal) navigate('/'); }
  }, [navigate, isModal]);

  // Load available cameras
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Prefer back camera
        const back = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
        setSelectedCamera(back ? back.id : devices[devices.length - 1].id);
      }
    }).catch(err => console.error('Camera error:', err));
  }, []);

  // Stop scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) { /* ignore */ }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    if (!selectedCamera) return;
    setScanResult(null);
    lastScannedRef.current = '';

    if (scannerRef.current) await stopScanner();

    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        selectedCamera,
        { fps: 20, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (processingRef.current || decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;
          processQRCode(decodedText);
        },
        () => { /* silent scan failure */ }
      );
      setIsScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setScanResult({ status: 'error', message: `Camera error: ${msg}` });
    }
  };

  const processQRCode = async (rawText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    await stopScanner();

    // 10 second safety timeout — prevents infinite "Verifying..." state
    const timeoutId = setTimeout(() => {
      if (processingRef.current) {
        processingRef.current = false;
        setProcessing(false);
        setScanResult({ status: 'error', message: 'Request timed out. Check your connection and try again.' });
      }
    }, 10000);

    try {
      // Call backend API — uses service key server-side to bypass RLS
      const response = await fetch(`${API_BASE_URL}/api/teams/verify-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: rawText, scan_type: activeScan }),
      });

      const result = await response.json();
      setScanResult({
        status: result.status,
        message: result.message,
        teamName: result.teamName,
        teamId: result.teamId,
        leaderName: result.leaderName,
        presentMembers: result.presentMembers || [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setScanResult({ status: 'error', message: `Connection error: ${msg}` });
    } finally {
      clearTimeout(timeoutId);
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    lastScannedRef.current = '';
    processingRef.current = false;
  };

  const handleScanTypeChange = async (type: ScanType) => {
    setActiveScan(type);
    setScanResult(null);
    lastScannedRef.current = '';
    if (isScanning) {
      await stopScanner();
    }
  };

  const activeType = SCAN_TYPES.find(s => s.key === activeScan)!;

  return (
    <div className={`min-h-screen ${isModal ? 'bg-transparent' : 'bg-black'} font-sans flex flex-col`}>

      {/* Header */}
      {!isModal && (
        <nav className="bg-black/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-neon-green/10 rounded-lg border border-neon-green/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-4.243 0L9.757 9.757m0 0L7.515 7.515M9.757 9.757L7.515 12M17 21a9 9 0 10-18 0v1h18v-1z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Hackaccino <span className="text-neon-green">4.0</span></span>
            </div>
            <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">QR Attendance</span>
            <button onClick={() => navigate('/')} className="text-white/50 hover:text-white text-sm transition-colors">← Back</button>
          </div>
        </nav>
      )}

      <div className={`flex-1 ${isModal ? 'p-4' : 'p-6 md:p-10'} max-w-2xl mx-auto w-full`}>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-neon-green/10 border border-neon-green/20 rounded-full px-4 py-1.5 mb-4">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-neon-green text-[11px] font-black uppercase tracking-widest">Scan Mode Active</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">QR Code Scanner</h1>
          <p className="text-white/40 text-sm mt-2">Select scan type, then point camera at participant QR code</p>
        </div>

        {/* Scan Type Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {SCAN_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => handleScanTypeChange(type.key)}
              className={`flex items-center gap-3 p-4 rounded-2xl border font-bold text-sm transition-all duration-200 ${
                activeScan === type.key ? ACTIVE_MAP[type.color] : COLOR_MAP[type.color] + ' hover:opacity-80'
              }`}
            >
              <span className="text-xl">{type.emoji}</span>
              <span>{type.label}</span>
              {activeScan === type.key && (
                <span className="ml-auto">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active Slot Info */}
        <div className={`flex items-center gap-3 rounded-2xl p-4 mb-6 border ${COLOR_MAP[activeType.color]}`}>
          <span className="text-2xl">{activeType.emoji}</span>
          <div>
            <p className="font-bold text-sm text-white">Currently scanning: {activeType.label}</p>
            <p className="text-xs text-white/40 mt-0.5">Each slot can only be used once per team</p>
          </div>
        </div>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green/40"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id} className="bg-black">{cam.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Viewport */}
        {!scanResult && (
          <div className="relative mb-6">
            <div
              id={scannerDivId}
              className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/50"
              style={{ minHeight: isScanning ? '340px' : '0px' }}
            />

            {/* Corner markers overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Animated scanning line */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-neon-green to-transparent animate-[scan_2s_linear_infinite]" />
                  </div>
                  {/* Corner borders */}
                  {[['top-0 left-0 border-t-2 border-l-2 rounded-tl-lg'], ['top-0 right-0 border-t-2 border-r-2 rounded-tr-lg'], ['bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg'], ['bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg']].map(([cls], i) => (
                    <div key={i} className={`absolute w-8 h-8 border-neon-green ${cls}`} />
                  ))}
                </div>
              </div>
            )}

            {processing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/60 text-sm">Verifying QR code...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`rounded-3xl border p-6 mb-6 ${
            scanResult.status === 'success'       ? 'bg-green-500/10 border-green-500/30' :
            scanResult.status === 'already_scanned' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                scanResult.status === 'success'       ? 'bg-green-500/20' :
                scanResult.status === 'already_scanned' ? 'bg-amber-500/20' :
                'bg-red-500/20'
              }`}>
                {scanResult.status === 'success' ? '✅' : scanResult.status === 'already_scanned' ? '⚠️' : '❌'}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-base mb-1 ${
                  scanResult.status === 'success' ? 'text-green-400' :
                  scanResult.status === 'already_scanned' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {scanResult.status === 'success' ? 'Check-in Successful!' :
                   scanResult.status === 'already_scanned' ? 'Already Scanned' : 'Invalid QR Code'}
                </p>
                <p className="text-white/60 text-sm mb-3">{scanResult.message}</p>

                {scanResult.teamName && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs uppercase tracking-widest font-bold">Team</span>
                      <span className="text-white font-bold">{scanResult.teamName}</span>
                      <span className="text-white/30 text-xs">#{scanResult.teamId}</span>
                    </div>
                    {scanResult.leaderName && (
                      <p className="text-white/50 text-sm">Leader: <span className="text-white/80">{scanResult.leaderName}</span></p>
                    )}
                    {scanResult.presentMembers && scanResult.presentMembers.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Present Members</p>
                        <div className="flex flex-wrap gap-1.5">
                          {scanResult.presentMembers.map((m, i) => (
                            <span key={i} className="bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs px-2 py-0.5 rounded-full font-medium">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isScanning && !scanResult && (
            <button
              onClick={startScanner}
              className="flex-1 py-4 bg-neon-green text-black font-black rounded-2xl hover:bg-neon-green/90 transition-all shadow-[0_0_20px_rgba(163,255,18,0.2)] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Start Camera
            </button>
          )}

          {isScanning && !scanResult && (
            <button
              onClick={stopScanner}
              className="flex-1 py-4 bg-red-500/15 border border-red-500/30 text-red-400 font-bold rounded-2xl hover:bg-red-500/25 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop Camera
            </button>
          )}

          {scanResult && (
            <>
              <button
                onClick={() => { resetScan(); startScanner(); }}
                className="flex-1 py-4 bg-neon-green text-black font-black rounded-2xl hover:bg-neon-green/90 transition-all shadow-[0_0_20px_rgba(163,255,18,0.2)]"
              >
                Scan Next
              </button>
              <button
                onClick={resetScan}
                className="px-6 py-4 bg-white/5 border border-white/10 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-all"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {/* Tip */}
        <p className="text-center text-white/20 text-xs mt-6">
          Only official Hackaccino QR codes will be accepted — each slot can only be marked once per team
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(256px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
