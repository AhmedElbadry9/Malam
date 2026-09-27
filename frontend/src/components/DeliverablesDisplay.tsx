import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Files } from 'lucide-react';
import { toSafeExternalUrl, parseDeliverableUrls } from '../utils/urlHelper';

interface DeliverablesDisplayProps {
  deliverableUrl?: string | null;
  deliverableNote?: string | null;
  title?: string;
  theme?: 'indigo' | 'amber' | 'emerald';
  compact?: boolean;
  className?: string;
  showNote?: boolean;
}

export const DeliverablesDisplay: React.FC<DeliverablesDisplayProps> = ({
  deliverableUrl,
  deliverableNote,
  title,
  theme = 'indigo',
  compact = false,
  className = '',
  showNote = false,
}) => {
  const urls = parseDeliverableUrls(deliverableUrl);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopySingle = (url: string, index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (urls.length === 0) return;
    navigator.clipboard.writeText(urls.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (urls.length === 0 && !deliverableNote) {
    return null;
  }

  // Theme color schemes
  const colorStyles = {
    indigo: {
      badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      titleText: 'text-indigo-300',
      btnOpen: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      linkText: 'text-indigo-200',
      cardBg: 'bg-slate-950 border-slate-800',
    },
    amber: {
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      titleText: 'text-amber-300',
      btnOpen: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black',
      linkText: 'text-amber-200',
      cardBg: 'bg-slate-950 border-slate-800',
    },
    emerald: {
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      titleText: 'text-emerald-300',
      btnOpen: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      linkText: 'text-emerald-200',
      cardBg: 'bg-slate-950 border-emerald-500/20',
    },
  }[theme];

  if (compact) {
    if (urls.length === 0) return null;
    return (
      <div className={`space-y-1.5 ${className}`}>
        {urls.map((url, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${colorStyles.badge}`}>
                #{idx + 1}
              </span>
              <span className="font-mono text-slate-300 truncate select-all" dir="ltr">
                {url}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleCopySingle(url, idx, e)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 flex items-center gap-1 font-bold text-[9px]"
                title="نسخ الرابط"
              >
                {copiedIndex === idx ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5" />
                )}
                <span>{copiedIndex === idx ? 'تم' : 'نسخ'}</span>
              </button>
              <a
                href={toSafeExternalUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`px-1.5 py-0.5 rounded transition-colors text-[9px] font-bold flex items-center gap-0.5 ${colorStyles.btnOpen}`}
                title="فتح الرابط ↗"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>فتح</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 text-right ${className}`}>
      {/* Header if multiple or title provided */}
      <div className="flex items-center justify-between gap-2">
        <label className={`text-xs font-bold flex items-center gap-1.5 ${colorStyles.titleText}`}>
          {urls.length > 1 ? (
            <Files className="w-3.5 h-3.5" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          <span>
            {title || (urls.length > 1 ? `روابط المخرجات المسجلة (${urls.length} روابط):` : 'رابط ملف المخرجات المسجل:')}
          </span>
        </label>

        {urls.length > 1 && (
          <button
            type="button"
            onClick={handleCopyAll}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
            title="نسخ جميع الروابط"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedAll ? 'تم نسخ جميع الروابط' : 'نسخ جميع الروابط'}</span>
          </button>
        )}
      </div>

      {urls.length === 0 ? (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-500 italic">
          لم يتم إرفاق رابط خارجي مع هذا التسليم.
        </div>
      ) : urls.length === 1 ? (
        // Single URL View
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm ${colorStyles.cardBg}`}>
          <span className={`font-mono text-xs font-semibold select-all break-all ${colorStyles.linkText}`} dir="ltr">
            {urls[0]}
          </span>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={(e) => handleCopySingle(urls[0], 0, e)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="نسخ الرابط"
            >
              {copiedIndex === 0 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 0 ? 'تم النسخ' : 'نسخ'}</span>
            </button>
            <a
              href={toSafeExternalUrl(urls[0])}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${colorStyles.btnOpen}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح الرابط ↗</span>
            </a>
          </div>
        </div>
      ) : (
        // Multiple URLs List
        <div className="space-y-2">
          {urls.map((url, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${colorStyles.cardBg}`}
            >
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border shrink-0 ${colorStyles.badge}`}>
                  رابط {idx + 1}
                </span>
                <span className={`font-mono text-xs font-semibold select-all break-all ${colorStyles.linkText}`} dir="ltr">
                  {url}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={(e) => handleCopySingle(url, idx, e)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer transition-colors"
                  title={`نسخ رابط ${idx + 1}`}
                >
                  {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === idx ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <a
                  href={toSafeExternalUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm ${colorStyles.btnOpen}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح ↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNote && deliverableNote && (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 italic">
          <span className="text-[10px] text-slate-400 block not-italic font-bold mb-0.5">
            شرح وملاحظات التسليم:
          </span>
          &quot;{deliverableNote}&quot;
        </div>
      )}
    </div>
  );
};
