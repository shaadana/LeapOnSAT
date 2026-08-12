import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '../utils';
import FamilyDashboard from '../components/family/FamilyDashboard';

export default function StudentFamilyView() {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type !== 'student') {
          navigate(createPageUrl('Dashboard'));
          return;
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('family_id');
    if (id) {
      setFamilyId(id);
    }
    
    loadUser();
  }, [navigate]);

  const { data: familyData } = useQuery({
    queryKey: ['studentFamily', familyId],
    queryFn: async () => {
      const [data] = await base44.entities.Family.filter({ id: familyId });
      return data;
    },
    enabled: !!familyId,
  });

  useEffect(() => {
    if (familyData) {
      setFamily(familyData);
    }
  }, [familyData]);

  if (!user || !family) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('MyGroups'))}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{family.family_name}</h1>
          <p className="text-gray-600">Connect with your family</p>
        </div>
      </div>

      <FamilyDashboard family={family} user={user} isParent={false} />
    </div>
  );
}
