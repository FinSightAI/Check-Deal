'use client';

import { useState, useRef, useEffect } from 'react';
import { Deal, DealAnalysis } from '@/lib/types/deal';
import { Bot, Send, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

const QUICK_QUESTIONS = [
  'What if I finance at 70% instead?',
  'Is this a good deal for Airbnb?',
  'What are the optimal tax strategies for my profile?',
  'How does this compare to market benchmarks?',
  'What should I negotiate on?',
  'What are the biggest risks I should know about?',
];

export function AIChat({ deal, analysis }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your real estate analyst for this deal. I have full context on **${deal.name}** — the property in ${deal.property.city}, the financial analysis, and your buyer profile (${deal.buyerProfile.taxResidency} tax resident).\n\nWhat would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal,
          analysis,
          messages: [...messages, userMsg],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Chat failed');
      }

      // Stream response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: fullText },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong. Make sure ANTHROPIC_API_KEY is set in .env.local'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <Bot className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-slate-700 text-sm">Deal Chat</span>
        <span className="text-xs text-slate-400 ml-auto">Full deal context loaded</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-blue-100' : 'bg-slate-200'}`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-blue-600" />
                : <User className="w-4 h-4 text-slate-600" />}
            </div>
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'assistant'
                ? 'bg-slate-100 text-slate-800'
                : 'bg-blue-500 text-white'
            }`}>
              {msg.content || (loading && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask anything about this deal..."
          disabled={loading}
          className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
