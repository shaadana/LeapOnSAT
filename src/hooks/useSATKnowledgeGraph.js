import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SAT_GRAPH_NODES } from '@/data/satKnowledgeGraph';
import { DOMAIN_TO_NODE_IDS } from '@/utils/satMasterySync';
import { getConsistentDomainScores, scoreToMasteryLevel } from '@/utils/performanceMetrics';

const MASTERY_ORDER_LIST = ['not_started', 'learning', 'practiced', 'mastered'];

export function useSATKnowledgeGraph(userId) {
  const { data: conceptNodes = [], isLoading: isLoadingNodes } = useQuery({
    queryKey: ['conceptNodes', userId],
    queryFn: () => base44.entities.ConceptNode.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: userProfiles = [], isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: practiceSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['practiceSessions', userId],
    queryFn: () => base44.entities.PracticeSession.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const isLoading = isLoadingNodes || isLoadingProfile || isLoadingSessions;

  const mergedNodes = useMemo(() => {
    if (!userId) return [];

    const consistentDomainScores = getConsistentDomainScores(userProfiles[0], conceptNodes, practiceSessions);

    const deduplicatedNodes = {};
    conceptNodes.forEach(n => {
      const key = n.node_id || n.title;
      if (!key) return;
      const existing = deduplicatedNodes[key];
      if (!existing) {
        deduplicatedNodes[key] = n;
      } else {
        const eIdx = MASTERY_ORDER_LIST.indexOf(existing.mastery_level || 'not_started');
        const nIdx = MASTERY_ORDER_LIST.indexOf(n.mastery_level || 'not_started');
        if (nIdx > eIdx) deduplicatedNodes[key] = n;
      }
    });

    return SAT_GRAPH_NODES.map(staticNode => {
      const userNode = deduplicatedNodes[staticNode.id] || deduplicatedNodes[staticNode.title];
      const dbMastery = userNode?.mastery_level;
      
      // Find which 12-category domain this node belongs to
      let matchingSubDomain = null;
      for (const [subDomain, nodeIds] of Object.entries(DOMAIN_TO_NODE_IDS)) {
        if (nodeIds.includes(staticNode.id)) {
          matchingSubDomain = subDomain;
          break;
        }
      }
      
      const domainScore = matchingSubDomain ? consistentDomainScores[matchingSubDomain] : null;
      const consistentMastery = domainScore != null ? scoreToMasteryLevel(domainScore) : 'not_started';

      const candidates = [dbMastery, consistentMastery].filter(Boolean);
      let finalMastery = 'not_started';
      if (candidates.length > 0) {
        finalMastery = candidates.reduce((best, m) =>
          MASTERY_ORDER_LIST.indexOf(m) > MASTERY_ORDER_LIST.indexOf(best) ? m : best
        );
      }
      
      return {
        ...staticNode,
        mastery_level: finalMastery,
        quiz_score: userNode?.quiz_score,
        dbId: userNode?.id,
        study_plan_title: 'SAT Math Practice',
        subject_area: staticNode.domain,
        tags: [],
        _domainStats: domainScore != null ? { fromSessions: true } : null,
      };
    });
  }, [userId, userProfiles, conceptNodes, practiceSessions]);

  return { mergedNodes, isLoading, practiceSessions };
}
