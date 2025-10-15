'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { notify } from '@/lib/notify';
import type { OrganisationSettings } from '@/types/organisation';
import {
  Building2,
  FileText,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Percent,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrganisationSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async (uid: string) => {
    try {
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
            default_super_rate: 11.5,
            default_pay_frequency: 'fortnightly',
            gst_registered: false,
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
    } catch (err) {
      console.error('Error loading settings:', err);
      notify.error('Error', 'Failed to load organisation settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        console.error('User not found');
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
      await loadSettings(data.user.id);
    };

    void fetchCurrentUser();
  }, [loadSettings]);

  const validateABN = (abn: string): boolean => {
    if (!abn) return true;
    const cleaned = abn.replace(/\s/g, '');
    if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) {
      setValidationErrors((prev) => ({ ...prev, abn: 'ABN must be 11 digits' }));
      return false;
    }
    setValidationErrors((prev) => {
      const { abn, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationErrors((prev) => ({ ...prev, contact_email: 'Invalid email format' }));
      return false;
    }
    setValidationErrors((prev) => {
      const { contact_email, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const updateField = <K extends keyof OrganisationSettings>(
    field: K,
    value: OrganisationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    if (field === 'abn' && typeof value === 'string') {
      validateABN(value);
    }
    if (field === 'contact_email' && typeof value === 'string') {
      validateEmail(value);
    }
  };

  async function saveSettings() {
    if (!userId) return;

    if (settings.abn && !validateABN(settings.abn)) {
      notify.error('Validation Error', 'Please fix the ABN before saving');
      return;
    }
    if (settings.contact_email && !validateEmail(settings.contact_email)) {
      notify.error('Validation Error', 'Please fix the email before saving');
      return;
    }

    setSaving(true);

    const payload = { ...settings, user_id: userId };

    try {
      const { data, error } = await supabase
        .from('organisation_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      setHasChanges(false);
      notify.success('Settings updated', 'Your organisation preferences were saved successfully.');
      window.dispatchEvent(new Event('org-settings-updated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      notify.error(
        'Error saving settings',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setSaving(false);
    }
  }

  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Organisation Settings</h1>
        <p className="text-gray-600 mt-2">Manage your business, tax, and payroll preferences</p>
      </div>

      {/* Save Banner */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-blue-600" size={20} />
            <div>
              <div className="font-medium text-blue-900">Unsaved Changes</div>
              <div className="text-sm text-blue-700">
                You have unsaved changes. Click Save to apply them.
              </div>
            </div>
          </div>
          <Button
            onClick={saveSettings}
            disabled={saving || Object.keys(validationErrors).length > 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Business Information */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={settings.business_name || ''}
              onChange={(e) => updateField('business_name', e.target.value)}
              placeholder="e.g. Kosta Consulting Pty Ltd"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">This will appear on reports and documents</p>
          </div>

          <div>
            <Label htmlFor="abn">Australian Business Number (ABN) *</Label>
            <Input
              id="abn"
              value={settings.abn || ''}
              onChange={(e) => updateField('abn', e.target.value)}
              placeholder="12 345 678 901"
              className={`mt-1 ${validationErrors.abn ? 'border-red-500' : ''}`}
            />
            {validationErrors.abn ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.abn}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">11-digit ABN (spaces optional)</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="admin@yourbusiness.com.au"
                className={`mt-1 ${validationErrors.contact_email ? 'border-red-500' : ''}`}
              />
              {validationErrors.contact_email && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {validationErrors.contact_email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={settings.contact_phone || ''}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                placeholder="0412 345 678"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="business_address">Business Address</Label>
            <Input
              id="business_address"
              value={settings.business_address || ''}
              onChange={(e) => updateField('business_address', e.target.value)}
              placeholder="123 Collins St, Melbourne VIC 3000"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Tax & Compliance */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Tax & Compliance</h2>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="gst_registered" className="text-sm font-medium text-gray-900">
                GST Registered
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                Toggle on if your business is registered for GST
              </p>
            </div>
            <Switch
              id="gst_registered"
              checked={!!settings.gst_registered}
              onCheckedChange={(checked) => updateField('gst_registered', checked)}
            />
          </div>

          {settings.gst_registered && (
            <div className="pl-4 border-l-2 border-gray-200 space-y-4">
              <div>
                <Label>GST Reporting Cycle</Label>
                <Select
                  value={settings.gst_cycle || 'quarterly'}
                  onValueChange={(val: 'monthly' | 'quarterly' | 'annual') =>
                    updateField('gst_cycle', val)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly (Most common)</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {settings.gst_cycle === 'quarterly' && 'BAS due 28 days after quarter end'}
                  {settings.gst_cycle === 'monthly' && 'BAS due 21 days after month end'}
                  {settings.gst_cycle === 'annual' && 'Annual GST return required'}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label>Financial Year Start Month</Label>
            <Select
              value={String(settings.financial_year_start_month ?? 7)}
              onValueChange={(val) => updateField('financial_year_start_month', Number(val))}
            >
              <SelectTrigger className="w-full mt-1">
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
                    {month} {idx === 6 && '(Standard Australian FY)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Australian financial year typically starts in July
            </p>
          </div>
        </div>
      </div>

      {/* Payroll Defaults */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payroll Defaults</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="default_super_rate">Default Superannuation Rate (%)</Label>
            <Input
              id="default_super_rate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.default_super_rate ?? 11.5}
              onChange={(e) => updateField('default_super_rate', Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current SG rate: 11.5% (increases to 12% from July 2025)
            </p>
          </div>

          <div>
            <Label>Default Pay Frequency</Label>
            <Select
              value={settings.default_pay_frequency || 'fortnightly'}
              onValueChange={(val: 'weekly' | 'fortnightly' | 'monthly') =>
                updateField('default_pay_frequency', val)
              }
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly (Most common)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              This will be the default when creating new employees
            </p>
          </div>

          <div>
            <Label>Default Pay Day</Label>
            <Select
              value={settings.default_pay_day || 'thursday'}
              onValueChange={(val) => updateField('default_pay_day', val)}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Preferred day for pay runs</p>
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Banking Information</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_bsb">Business BSB</Label>
              <Input
                id="bank_bsb"
                value={settings.bank_bsb || ''}
                onChange={(e) => updateField('bank_bsb', e.target.value)}
                placeholder="063-000"
                className="mt-1"
                maxLength={7}
              />
            </div>

            <div>
              <Label htmlFor="bank_account">Business Account Number</Label>
              <Input
                id="bank_account"
                value={settings.bank_account || ''}
                onChange={(e) => updateField('bank_account', e.target.value)}
                placeholder="12345678"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bank_account_name">Account Name</Label>
            <Input
              id="bank_account_name"
              value={settings.bank_account_name || ''}
              onChange={(e) => updateField('bank_account_name', e.target.value)}
              placeholder="Same as business name"
              className="mt-1"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-blue-900">
                <strong>Note:</strong> This account will be used for payroll payments. Ensure you
                have sufficient funds before running payroll.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-8">
        <div className="text-sm text-gray-500">
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              Last updated: {lastUpdated}
            </div>
          )}
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving || !hasChanges || Object.keys(validationErrors).length > 0}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
