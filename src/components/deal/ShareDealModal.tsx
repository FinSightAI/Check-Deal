'use client';

import { useState } from 'react';
import { Deal } from '@/lib/types/deal';
import { X, Link, Eye, Edit3, Copy, Check, AlertCircle, Users, Lock } from 'lucide-react';

interface Props {
  deal: Deal;
  onClose: () => void;
}

export function ShareDealModal({ deal, onClose }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const shareUrl = token ? `${window.location.origin}/shared/${token}` : '';

  const createLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shared-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal,
          allowEdit: mode === 'edit',
          pin: usePin && pin ? pin : null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setToken(json.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-slate-800">Share Deal</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Deal name */}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Sharing</p>
            <p className="font-semibold text-slate-800 truncate">{deal.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{deal.property.city}, {deal.property.state}</p>
          </div>

          {/* Mode toggle */}
          {!token && (
            <>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Access level</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('view')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      mode === 'view' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Eye className={`w-4 h-4 ${mode === 'view' ? 'text-blue-500' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-sm font-medium ${mode === 'view' ? 'text-blue-800' : 'text-slate-700'}`}>
                        View only
                      </div>
                      <div className="text-xs text-slate-400">Read-only access</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('edit')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      mode === 'edit' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Edit3 className={`w-4 h-4 ${mode === 'edit' ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-sm font-medium ${mode === 'edit' ? 'text-indigo-800' : 'text-slate-700'}`}>
                        Can edit
                      </div>
                      <div className="text-xs text-slate-400">Collaborative editing</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* PIN option */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePin}
                    onChange={e => setUsePin(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Protect with PIN</span>
                  </div>
                </label>
                {usePin && (
                  <input
                    type="text"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-6 digit PIN"
                    className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-widest text-center font-mono"
                    maxLength={6}
                  />
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={createLink}
                disabled={loading || (usePin && pin.length < 4)}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                {loading ? 'Creating link…' : 'Generate Share Link'}
              </button>
            </>
          )}

          {/* Link created */}
          {token && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-emerald-700 font-semibold mb-1">
                  {mode === 'edit' ? '✏️ Edit link created!' : '🔗 View link created!'}
                </div>
                <div className="text-xs text-emerald-600">
                  {mode === 'edit' ? 'Anyone with this link can view and edit this deal' : 'Anyone with this link can view this deal'}
                  {usePin && pin && ' · Requires PIN to edit'}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-slate-600 truncate outline-none"
                />
                <button
                  onClick={copy}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {usePin && pin && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>Share the PIN separately: <strong className="font-mono tracking-widest">{pin}</strong></span>
                </div>
              )}

              <button
                onClick={() => { setToken(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-1"
              >
                Create another link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
