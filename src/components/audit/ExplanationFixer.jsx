import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Wrench, Check, X, FileText, AlertCircle } from 'lucide-react';

const ENTITIES = [
  { key: 'CanyonMath', label: 'Canyon Math' },
  { key: 'SATQuestion', label: 'SAT Math' },
  { key: 'PYQQuestion', label: 'PYQ Questions' },
  { key: 'EnglishQuestion', label: 'SAT English' },
];

export default function ExplanationFixer() {
  const [entity, setEntity] = useState('CanyonMath');
  const [previews, setPreviews] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [committedIds, setCommittedIds] = useState(new Set());

  const runScan = async () => {
    setLoading(true);
    setPreviews([]);
    setSkipped([]);
    setStats(null);
    setCommittedIds(new Set());

    let offset = 0;
    const batchSize = 8;
    let allPreviews = [];
    let allSkipped = [];
    let totalBadFound = 0;
    let totalInDb = 0;

    try {
      while (true) {
        setProgress(`Scanning ${entity} — batch starting at ${offset}…`);
        const res = await base44.functions.invoke('rewriteQuestionExplanations', {
          entity, mode: 'scan', offset, batch_size: batchSize,
        });
        const data = res.data;
        if (data.error) throw new Error(data.error);

        totalBadFound = data.total_bad_found;
        totalInDb = data.total_in_db;
        allPreviews = [...allPreviews, ...(data.previews || [])];
        allSkipped = [...allSkipped, ...(data.skipped || [])];
        setPreviews([...allPreviews]);
        setSkipped([...allSkipped]);

        if (!data.has_more) break;
        offset += batchSize;
      }
      setStats({ totalInDb, totalBadFound, rewriteable: allPreviews.length, skipped: allSkipped.length });
      setProgress(`Scan complete: ${allPreviews.length} safe rewrites ready, ${allSkipped.length} skipped.`);
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const commitItems = async (items) => {
    if (items.length === 0) return;
    setCommitting(true);
    setProgress(`Applying ${items.length} explanation rewrite(s)…`);
    try {
      const payload = items.map(p => ({ id: p.id, new_explanation: p.new_explanation }));
      const res = await base44.functions.invoke('rewriteQuestionExplanations', {
        entity, mode: 'commit', commit_items: payload,
      });
      if (res.data.error) throw new Error(res.data.error);
      const newCommitted = new Set(committedIds);
      (res.data.updated_ids || []).forEach(id => newCommitted.add(id));
      setCommittedIds(newCommitted);
      setProgress(`✓ Updated ${res.data.updated_count} explanation(s).`);
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
    setCommitting(false);
  };

  const dismissPreview = (id) => {
    setPreviews(prev => prev.filter(p => p.id !== id));
  };

  const visiblePreviews = previews.filter(p => !committedIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold mb-1">How this works (safety-first)</p>
          <ul className="list-disc ml-4 space-y-0.5 text-xs">
            <li>Only scans explanations that are <strong>missing or contain hedging/answer-key language</strong>.</li>
            <li>The LLM solves each problem independently and only proposes a rewrite if its answer <strong>matches the stored answer</strong>.</li>
            <li>If the LLM disagrees with the stored answer, the question is <strong>skipped</strong> (not rewritten) and surfaced for manual review.</li>
            <li><strong>Answer keys are never modified</strong> by this tool.</li>
            <li>You review every rewrite before clicking Apply.</li>
          </ul>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 flex-wrap">
            {ENTITIES.map(e => (
              <button
                key={e.key}
                onClick={() => setEntity(e.key)}
                disabled={loading || committing}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  entity === e.key
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>

          <Button onClick={runScan} disabled={loading || committing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Scanning…' : 'Scan for Bad Explanations'}
          </Button>

          {visiblePreviews.length > 0 && (
            <Button
              onClick={() => commitItems(visiblePreviews)}
              disabled={loading || committing}
              className="bg-stone-800 hover:bg-stone-900 text-white gap-2"
            >
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              Apply All Rewrites ({visiblePreviews.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {progress && (
        <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
          {loading || committing
            ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            : <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {progress}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border-2 border-stone-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-stone-800">{stats.totalInDb}</p>
            <p className="text-xs text-stone-500 mt-1">Total in DB</p>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{stats.totalBadFound}</p>
            <p className="text-xs text-stone-500 mt-1">Bad explanations</p>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.rewriteable}</p>
            <p className="text-xs text-stone-500 mt-1">Safe rewrites</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.skipped}</p>
            <p className="text-xs text-stone-500 mt-1">Skipped (need review)</p>
          </div>
        </div>
      )}

      {/* Skipped section — answer-mismatch cases needing manual review */}
      {skipped.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Skipped — Manual Review Needed ({skipped.length})
          </h2>
          <p className="text-xs text-stone-500">
            These questions were not rewritten because the LLM independently arrived at a different answer than what's stored, or the rewrite still contained hedging language.
          </p>
          {skipped.map((s, i) => (
            <Card key={i} className="border-2 border-red-200 bg-red-50/40">
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm text-stone-800 font-medium">{s.question_snippet}…</p>
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <Badge variant="secondary" className="bg-stone-100">Stored: {String(s.stored_answer)}</Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">LLM said: {String(s.llm_answer)}</Badge>
                  <Badge variant="outline" className="text-stone-500">Flagged: {s.flagged_reason}</Badge>
                </div>
                <p className="text-xs text-stone-600 italic">{s.reason}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Previews — safe to apply */}
      {visiblePreviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Proposed Rewrites ({visiblePreviews.length})
          </h2>
          {visiblePreviews.map((p) => (
            <Card key={p.id} className="border-2 border-emerald-200">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-sm text-stone-800 font-medium">{p.question_snippet}…</p>
                  <div className="flex gap-2 mt-1 flex-wrap text-xs">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      Stored answer: {String(p.stored_answer)} ✓ matches LLM
                    </Badge>
                    <Badge variant="outline" className="text-stone-500">Flagged: {p.flagged_reason}</Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Old explanation</p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-stone-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {p.old_explanation}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 mb-1">New explanation</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-stone-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {p.new_explanation}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => commitItems([p])} disabled={committing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    <Check className="w-3 h-3" /> Apply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dismissPreview(p.id)} disabled={committing} className="gap-1">
                    <X className="w-3 h-3" /> Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
