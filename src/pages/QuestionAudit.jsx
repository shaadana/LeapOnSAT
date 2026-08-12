import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Wrench, Check, X, FileText, ShieldCheck } from 'lucide-react';
import ExplanationFixer from '@/components/audit/ExplanationFixer';

export default function QuestionAudit() {
  const [tab, setTab] = useState('answers');
  const [entity, setEntity] = useState('SATQuestion');
  const [results, setResults] = useState(null);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [progress, setProgress] = useState('');

  const runFullAudit = async () => {
    setLoading(true);
    setAllIssues([]);
    setResults(null);
    let offset = 0;
    const batchSize = 20;
    let combined = [];
    let total = 0;

    try {
      while (true) {
        setProgress(`Auditing questions ${offset + 1}–${offset + batchSize}...`);
        const res = await base44.functions.invoke('validateQuestionAnswers', {
          entity, batch_size: batchSize, offset, fix: false
        });
        const data = res.data;
        total = data.total_in_db;
        combined = [...combined, ...data.issues];
        setAllIssues([...combined]);

        if (!data.has_more) break;
        offset += batchSize;
      }

      setResults({ total, issuesFound: combined.length });
      setProgress('');
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const applyFixes = async (issuesToFix) => {
    setFixing(true);
    setProgress(`Applying ${issuesToFix.length} fixes...`);
    try {
      const fixPayload = issuesToFix.map(i => ({ id: i.id, correct_answer: i.ai_suggested_answer }));
      await base44.functions.invoke('validateQuestionAnswers', {
        entity, fix_specific: fixPayload
      });
      const fixedIds = new Set(issuesToFix.map(i => i.id));
      setAllIssues(prev => prev.filter(i => !fixedIds.has(i.id)));
      setProgress(`Fixed ${issuesToFix.length} answers successfully!`);
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
    setFixing(false);
  };

  const dismissIssue = (id) => {
    setAllIssues(prev => prev.filter(i => i.id !== id));
  };

  const confidenceColor = (c) => c === 'high' ? 'destructive' : c === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Question Audit</h1>
        <p className="text-stone-500 text-sm mt-1">AI-powered tools for verifying answers and improving explanations</p>
      </div>

      <div className="flex gap-2 border-b-2 border-stone-100 pb-2">
        <button
          onClick={() => setTab('answers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            tab === 'answers' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Answer Validation
        </button>
        <button
          onClick={() => setTab('explanations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            tab === 'explanations' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Explanation Fixer
        </button>
      </div>

      {tab === 'explanations' && <ExplanationFixer />}

      {tab === 'answers' && (
      <>
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setEntity('SATQuestion')}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${entity === 'SATQuestion' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'}`}
            >
              SAT Math
            </button>
            <button
              onClick={() => setEntity('EnglishQuestion')}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${entity === 'EnglishQuestion' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'}`}
            >
              SAT English
            </button>
          </div>

          <Button onClick={runFullAudit} disabled={loading || fixing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Auditing...' : 'Run Full Audit'}
          </Button>

          {allIssues.length > 0 && (
            <>
              {allIssues.some(i => i.confidence === 'high') && (
                <Button onClick={() => applyFixes(allIssues.filter(i => i.confidence === 'high'))} disabled={fixing || loading} variant="destructive" className="gap-2">
                  {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                  Fix High-Confidence ({allIssues.filter(i => i.confidence === 'high').length})
                </Button>
              )}
              <Button onClick={() => applyFixes(allIssues)} disabled={fixing || loading} className="bg-stone-800 hover:bg-stone-900 text-white gap-2">
                {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                Fix All ({allIssues.length})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {progress && (
        <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
          {loading || fixing ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {progress}
        </div>
      )}

      {results && (
        <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border-2 ${allIssues.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          {allIssues.length === 0
            ? <CheckCircle className="w-5 h-5 text-emerald-600" />
            : <AlertTriangle className="w-5 h-5 text-amber-600" />}
          <span className="font-medium text-stone-800">
            Audited {results.total} questions — {allIssues.length === 0 ? 'All answers look correct! ✓' : `${allIssues.length} potential issues found`}
          </span>
        </div>
      )}

      {allIssues.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-stone-700">Issues Found ({allIssues.length})</h2>
          {allIssues.map((issue, i) => (
            <Card key={i} className={`border-2 ${issue.confidence === 'high' ? 'border-red-200' : issue.confidence === 'medium' ? 'border-amber-200' : 'border-stone-200'}`}>
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm text-stone-700 font-medium">{issue.question_snippet}…</p>
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="text-stone-500">Stored:</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-700">{issue.current_answer}</Badge>
                  <span className="text-stone-400">→</span>
                  <span className="text-stone-500">Should be:</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{issue.ai_suggested_answer}</Badge>
                  <Badge variant={confidenceColor(issue.confidence)}>{issue.confidence} confidence</Badge>
                </div>
                {issue.reason && <p className="text-xs text-stone-500 italic">{issue.reason}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => applyFixes([issue])} disabled={fixing} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    <Check className="w-3 h-3" /> Apply Fix
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dismissIssue(issue.id)} disabled={fixing} className="gap-1">
                    <X className="w-3 h-3" /> Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
