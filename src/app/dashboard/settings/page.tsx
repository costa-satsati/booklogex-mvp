'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { notify } from '@/lib/notify';
import type { OrganisationSettings } from '@/types/organisation';

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrganisationSettings>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      console.error('User not found');
      return;
    }

    setUserId(data.user.id);
    await loadSettings(data.user.id);
  }

  async function loadSettings(uid: string) {
    const { data, error } = await supabase
      .from('organisation_settings')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (error) {
      console.warn('No settings found, creating defaults...');
      const { data: newRow, error: insertErr } = await supabase
        .from('organisation_settings')
        .insert({
          user_id: uid,
          gst_cycle: 'quarterly',
          financial_year_start_month: 7,
          default_super_rate: 11,
          default_pay_frequency: 'fortnightly',
        })
        .select()
        .single();

      if (insertErr) {
        notify.error('Failed to load settings', insertErr.message);
      } else if (newRow) {
        setSettings(newRow);
      }
    } else if (data) {
      setSettings(data);
    }

    setLoading(false);
  }

  async function saveSettings() {
    if (!userId) return;
    setLoading(true);

    const payload = { ...settings, user_id: userId };

    const { data, error } = await supabase
      .from('organisation_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    setLoading(false);

    if (error) {
      notify.error('Error saving settings', error.message);
    } else {
      setSettings(data);
      notify.success('Settings updated', 'Your organisation preferences were saved successfully.');
      window.dispatchEvent(new Event('org-settings-updated'));
    }
  }

  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  if (loading) {
    return <div className="p-8 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Organisation Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your business, tax, and payroll preferences for BookLogex.
        </p>
      </div>

      {/* Business Info */}
      <Card className="rounded-2xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-700 text-lg">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              value={settings.business_name || ''}
              onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              placeholder="e.g. Kosta Consulting Pty Ltd"
            />
          </div>

          <div>
            <Label htmlFor="abn">ABN</Label>
            <Input
              id="abn"
              value={settings.abn || ''}
              onChange={(e) => setSettings({ ...settings, abn: e.target.value })}
              placeholder="11-digit ABN"
            />
          </div>

          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              placeholder="admin@yourbusiness.com.au"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax & Compliance */}
      <Card className="rounded-2xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-700 text-lg">Tax & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="gst_registered" className="text-slate-700">
                GST Registered
              </Label>
              <p className="text-xs text-slate-500">
                Toggle on if your business is registered for GST.
              </p>
            </div>
            <Switch
              checked={!!settings.gst_registered}
              onCheckedChange={(checked) => setSettings({ ...settings, gst_registered: checked })}
            />
          </div>

          <div>
            <Label>GST Reporting Cycle</Label>
            <Select
              value={settings.gst_cycle || 'quarterly'}
              onValueChange={(val) => setSettings({ ...settings, gst_cycle: val as any })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Start of Financial Year</Label>
            <Select
              value={String(settings.financial_year_start_month ?? 7)}
              onValueChange={(val) =>
                setSettings({
                  ...settings,
                  financial_year_start_month: Number(val),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((month, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Defaults */}
      <Card className="rounded-2xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-700 text-lg">Payroll Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Super Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.default_super_rate ?? 11}
              onChange={(e) =>
                setSettings({ ...settings, default_super_rate: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <Label>Default Pay Frequency</Label>
            <Select
              value={settings.default_pay_frequency || 'fortnightly'}
              onValueChange={(val) =>
                setSettings({ ...settings, default_pay_frequency: val as any })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Footer with Save + Last Updated */}
      <div className="flex flex-col items-end gap-2 pt-2">
        {lastUpdated && <p className="text-xs text-slate-500">Last updated: {lastUpdated}</p>}
        <Button
          onClick={saveSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
