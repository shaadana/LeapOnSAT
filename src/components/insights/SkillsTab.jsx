import { useState } from 'react';
import StruggledSkillsChart from './StruggledSkillsChart';
import RecentMistakesSummary from './RecentMistakesSummary';
import SessionHistoryTable from './SessionHistoryTable';

/**
 * Skills & Mistakes tab — struggled skills chart, recent mistakes summary,
 * and expandable session history. `sessions` is already subject-filtered by the parent.
 */
export default function SkillsTab({ sessions }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-6">
      <StruggledSkillsChart sessions={sessions} />
      <RecentMistakesSummary sessions={sessions} />
      {sessions.length > 0 && (
        <SessionHistoryTable
          sessions={sessions}
          showAll={showHistory}
          onToggleShowAll={() => setShowHistory(h => !h)}
        />
      )}
    </div>
  );
}
