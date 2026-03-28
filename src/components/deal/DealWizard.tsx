'use client';

import { useState } from 'react';
import { useDealStore } from '@/lib/store/dealStore';
import { Step1BuyerProfile } from './wizard/Step1BuyerProfile';
import { Step2Property } from './wizard/Step2Property';
import { Step3Financing } from './wizard/Step3Financing';
import { Step4Rental } from './wizard/Step4Rental';
import { Step5Review } from './wizard/Step5Review';
import { ImportFromListing } from './ImportFromListing';
import { ArrowLeft, Building2, Sparkles } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export function DealWizard({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const totalSteps = 5;

  const STEPS = [
    { label: 'Your Profile', short: 'Profile' },
    { label: 'Property Details', short: 'Property' },
    { label: 'Financing', short: 'Financing' },
    { label: 'Rental Strategy', short: 'Rental' },
    { label: 'Review & Analyze', short: 'Analyze' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800">CheckDeal</span>
          </div>
          <div className="flex-1" />
          <span className="text-sm text-slate-500">Step {step} of {totalSteps}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      i + 1 < step
                        ? 'bg-blue-500 text-white'
                        : i + 1 === step
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1 < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${i + 1 === step ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                    {s.short}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i + 1 < step ? 'bg-blue-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Import button — shown on step 2 (property) */}
        {step === 2 && !showImport && (
          <div className="mb-6">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Import from listing (ZAP / OLX / VivaReal)
            </button>
          </div>
        )}

        {step === 2 && showImport && (
          <div className="mb-6">
            <ImportFromListing onImported={() => setShowImport(false)} />
            <button
              onClick={() => setShowImport(false)}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ← Fill manually instead
            </button>
          </div>
        )}

        {step === 1 && <Step1BuyerProfile onNext={() => setStep(2)} />}
        {step === 2 && <Step2Property onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3Financing onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4Rental onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <Step5Review onComplete={onComplete} onBack={() => setStep(4)} />}
      </div>
    </div>
  );
}
