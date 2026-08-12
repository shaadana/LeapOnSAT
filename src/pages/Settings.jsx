import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle, User, Clock, GraduationCap, Calendar, Award, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import HelpSection from '@/components/help/HelpSection';
import QuickTour from '@/components/help/QuickTour';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time - Puerto Rico (AT)' },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [satTargetDate, setSatTargetDate] = useState('');
  const [gamificationEnabled, setGamificationEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showTour, setShowTour] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFullName(userData.name || userData.full_name || '');
        setTimezone(userData.timezone || '');
        setGamificationEnabled(userData.gamification_enabled !== false);
        setEmailNotificationsEnabled(userData.email_notifications_enabled !== false);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: userProfileData } = useQuery({
    queryKey: ['userProfileSettings', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id && (user?.user_type === 'student' || !user?.user_type),
  });

  const userProfile = userProfileData?.[0];

  useEffect(() => {
    if (userProfile) {
      if (userProfile.grade_level) setGradeLevel(userProfile.grade_level);
      if (userProfile.sat_target_date) setSatTargetDate(userProfile.sat_target_date);
    }
  }, [userProfile]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Update all user fields in one call
      const updatePayload = { name: data.full_name };
      if (data.timezone) updatePayload.timezone = data.timezone;
      if (data.gamification_enabled !== undefined) updatePayload.gamification_enabled = data.gamification_enabled;
      if (data.email_notifications_enabled !== undefined) updatePayload.email_notifications_enabled = data.email_notifications_enabled;
      
      const result = await base44.auth.updateMe(updatePayload);
      
      // Save grade/SAT date to UserProfile if student
      if (user?.user_type === 'student' || !user?.user_type) {
        const profileUpdate = {};
        if (data.grade_level !== undefined) profileUpdate.grade_level = data.grade_level;
        if (data.sat_target_date !== undefined) profileUpdate.sat_target_date = data.sat_target_date;
        if (Object.keys(profileUpdate).length > 0) {
          if (userProfile?.id) {
            await base44.entities.UserProfile.update(userProfile.id, profileUpdate);
          } else {
            await base44.entities.UserProfile.create({ user_id: user.id, ...profileUpdate });
          }
        }
      }
      
      // Return the data we sent merged with the result, so the UI always reflects what user typed
      return { ...result, name: data.full_name, timezone: data.timezone || result?.timezone };
    },
    onSuccess: (updatedUser) => {
      toast.success('Profile updated successfully!');
      setUser(updatedUser);
      setFullName(updatedUser.name || updatedUser.full_name || '');
      setTimezone(updatedUser.timezone || '');
      queryClient.invalidateQueries({ queryKey: ['userProfileSettings', updatedUser?.id] });
    },
    onError: (err) => {
      console.error('[Settings] Save error:', err);
      toast.error('Failed to save: ' + (err?.message || 'Unknown error'));
    }
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteAccount', {});
      if (response?.data?.success) {
        toast.success('Account deleted. Logging out…');
        setTimeout(() => base44.auth.logout(), 1500);
      } else {
        const err = response?.data?.error || 'Unknown error';
        const msg = response?.data?.message || '';
        if (err === 'cannot_delete_user' || msg.includes('owner')) {
          toast.error('Cannot delete: You are the app owner. Transfer ownership first.');
        } else {
          toast.error('Failed to delete account: ' + (msg || err));
        }
        setIsDeleting(false);
      }
    } catch (error) {
      toast.error('Failed to delete account: ' + error.message);
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showTour && <QuickTour userType={user.user_type} onClose={() => setShowTour(false)} />}
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <Label>Role</Label>
            <Input value={user.role} disabled className="bg-gray-50 capitalize" />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4" /> Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(user?.user_type === 'student' || !user?.user_type) && (
            <>
              <div>
                <Label className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4" /> Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {["8th", "9th", "10th", "11th", "12th", "Gap Year / Other"].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4" /> Target SAT Date</Label>
                <Input
                  type="date"
                  value={satTargetDate}
                  onChange={e => setSatTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2"><Award className="w-4 h-4" /> Rewards & Gamification</Label>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-800">Enable Rewards</span>
                    <span className="text-xs text-gray-500">Earn XP, level up, unlock items, and customize your Memory Palace.</span>
                  </div>
                  <Switch
                    checked={gamificationEnabled}
                    onCheckedChange={setGamificationEnabled}
                  />
                </div>
              </div>
            </>
          )}

          <Button
            onClick={() => updateMutation.mutate({ full_name: fullName, timezone, grade_level: gradeLevel, sat_target_date: satTargetDate, gamification_enabled: gamificationEnabled, email_notifications_enabled: emailNotificationsEnabled })}
            disabled={!fullName.trim() || updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Control which emails you receive from LeapOn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-800">Email Notifications</span>
              <span className="text-xs text-gray-500">Receive study reminders, assignment alerts, weekly progress reports, and session summaries by email.</span>
            </div>
            <Switch
              checked={emailNotificationsEnabled}
              onCheckedChange={setEmailNotificationsEnabled}
            />
          </div>
          <Button
            onClick={() => updateMutation.mutate({ full_name: fullName, timezone, grade_level: gradeLevel, sat_target_date: satTargetDate, gamification_enabled: gamificationEnabled, email_notifications_enabled: emailNotificationsEnabled })}
            disabled={!fullName.trim() || updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 mt-4"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <HelpSection onStartTour={() => setShowTour(true)} />

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanent actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-red-600">Delete Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                    <li>Your profile and diagnostic results</li>
                    <li>All study habits and practice sessions</li>
                    {user?.user_type === 'teacher' && <li>All classes and students associations</li>}
                    {user?.user_type === 'parent' && <li>All families, goals, and events</li>}
                    {user?.user_type === 'student' && <li>Your enrollment in all classes and families</li>}
                    <li>Your account data (cannot be recovered)</li>
                  </ul>
                  {user?.role === 'admin' && (
                    <p className="text-xs text-red-600 mt-3 font-semibold">
                      Note: App owners cannot be deleted. Create a test user account to test deletion.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Type DELETE to confirm</Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowDeleteDialog(false);
                  setConfirmText('');
                }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete My Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
