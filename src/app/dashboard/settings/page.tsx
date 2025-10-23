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
import {
  Building2,
  FileText,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
  Shield,
  Bell,
} from 'lucide-react';

type Organisation = {
  id?: string;
  owner_id?: string;
  name?: string | null;
  abn?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_address?: string | null;
  gst_registered?: boolean;
  gst_cycle?: 'monthly' | 'quarterly' | 'annual';
  financial_year_start_month?: number;
  default_super_rate?: number;
  default_pay_frequency?: 'weekly' | 'fortnightly' | 'monthly';
  default_pay_day?: string | null;
  bank_bsb?: string | null;
  bank_account?: string | null;
  bank_account_name?: string | null;
  updated_at?: string;
};

type UserProfile = {
  id?: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: string;
};

type ActiveTab = 'organisation' | 'profile';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('organisation');
  const [organisation, setOrganisation] = useState<Organisation>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async (uid: string) => {
    try {
      // Load organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('owner_id', uid)
        .single();

      if (orgError) throw orgError;
      setOrganisation(orgData || {});

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData || {});
    } catch (err) {
      console.error('Error loading settings:', err);
      notify.error('Error', 'Failed to load settings');
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
      await loadData(data.user.id);
    };

    void fetchCurrentUser();
  }, [loadData]);

  const validateABN = (abn: string): boolean => {
    if (!abn) return true;
    const cleaned = abn.replace(/\s/g, '');
    if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) {
      setValidationErrors((prev) => ({ ...prev, abn: 'ABN must be 11 digits' }));
      return false;
    }
    setValidationErrors((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { contact_email, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const updateOrgField = <K extends keyof Organisation>(field: K, value: Organisation[K]) => {
    setOrganisation((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    if (field === 'abn' && typeof value === 'string') {
      validateABN(value);
    }
    if (field === 'contact_email' && typeof value === 'string') {
      validateEmail(value);
    }
  };

  const updateProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setUserProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  async function saveSettings() {
    if (!userId) return;

    // Validate
    if (organisation.abn && !validateABN(organisation.abn)) {
      notify.error('Validation Error', 'Please fix the ABN before saving');
      return;
    }
    if (organisation.contact_email && !validateEmail(organisation.contact_email)) {
      notify.error('Validation Error', 'Please fix the email before saving');
      return;
    }

    setSaving(true);

    try {
      if (activeTab === 'organisation') {
        // Save organisation
        const { error: orgError } = await supabase
          .from('organisations')
          .update({
            name: organisation.name,
            abn: organisation.abn,
            contact_email: organisation.contact_email,
            contact_phone: organisation.contact_phone,
            business_address: organisation.business_address,
            gst_registered: organisation.gst_registered,
            gst_cycle: organisation.gst_cycle,
            financial_year_start_month: organisation.financial_year_start_month,
            default_super_rate: organisation.default_super_rate,
            default_pay_frequency: organisation.default_pay_frequency,
            default_pay_day: organisation.default_pay_day,
            bank_bsb: organisation.bank_bsb,
            bank_account: organisation.bank_account,
            bank_account_name: organisation.bank_account_name,
          })
          .eq('owner_id', userId);

        if (orgError) throw orgError;

        notify.success('Settings saved', 'Organisation settings updated successfully');
        window.dispatchEvent(new Event('org-settings-updated'));
      } else {
        // Save user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: userProfile.full_name,
            phone: userProfile.phone,
          })
          .eq('id', userId);

        if (profileError) throw profileError;

        notify.success('Profile saved', 'Your profile has been updated successfully');
      }

      setHasChanges(false);
      await loadData(userId); // Refresh data
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

  const lastUpdated = organisation?.updated_at
    ? new Date(organisation.updated_at).toLocaleString('en-AU', {
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
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your organisation and profile settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('organisation');
              setHasChanges(false);
            }}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'organisation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              Organisation Settings
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('profile');
              setHasChanges(false);
            }}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={18} />
              My Profile
            </div>
          </button>
        </div>
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

      {/* ORGANISATION TAB */}
      {activeTab === 'organisation' && (
        <div className="space-y-6">
          {/* Onboarding Alert (if name is NULL) */}
          {!organisation.name && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-600" size={20} />
                <div>
                  <div className="font-medium text-amber-900">Complete Your Setup</div>
                  <div className="text-sm text-amber-700 mt-1">
                    Add your business name and ABN to start using payroll features
                  </div>
                </div>
              </div>
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
                  value={organisation.name || ''}
                  onChange={(e) => updateOrgField('name', e.target.value)}
                  placeholder="e.g. Kosta Consulting Pty Ltd"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will appear on payslips and reports
                </p>
              </div>

              <div>
                <Label htmlFor="abn">Australian Business Number (ABN) *</Label>
                <Input
                  id="abn"
                  value={organisation.abn || ''}
                  onChange={(e) => updateOrgField('abn', e.target.value)}
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
                    value={organisation.contact_email || ''}
                    onChange={(e) => updateOrgField('contact_email', e.target.value)}
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
                    value={organisation.contact_phone || ''}
                    onChange={(e) => updateOrgField('contact_phone', e.target.value)}
                    placeholder="0412 345 678"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Input
                  id="business_address"
                  value={organisation.business_address || ''}
                  onChange={(e) => updateOrgField('business_address', e.target.value)}
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
                  checked={!!organisation.gst_registered}
                  onCheckedChange={(checked) => updateOrgField('gst_registered', checked)}
                />
              </div>

              {organisation.gst_registered && (
                <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                  <div>
                    <Label>GST Reporting Cycle</Label>
                    <Select
                      value={organisation.gst_cycle || 'quarterly'}
                      onValueChange={(val: 'monthly' | 'quarterly' | 'annual') =>
                        updateOrgField('gst_cycle', val)
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
                      {organisation.gst_cycle === 'quarterly' &&
                        'BAS due 28 days after quarter end'}
                      {organisation.gst_cycle === 'monthly' && 'BAS due 21 days after month end'}
                      {organisation.gst_cycle === 'annual' && 'Annual GST return required'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label>Financial Year Start Month</Label>
                <Select
                  value={String(organisation.financial_year_start_month ?? 7)}
                  onValueChange={(val) => updateOrgField('financial_year_start_month', Number(val))}
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
                  value={organisation.default_super_rate ?? 11.5}
                  onChange={(e) => updateOrgField('default_super_rate', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current SG rate: 11.5% (increases to 12% from July 2025)
                </p>
              </div>

              <div>
                <Label>Default Pay Frequency</Label>
                <Select
                  value={organisation.default_pay_frequency || 'fortnightly'}
                  onValueChange={(val: 'weekly' | 'fortnightly' | 'monthly') =>
                    updateOrgField('default_pay_frequency', val)
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
                  Default pay frequency for new employees
                </p>
              </div>

              <div>
                <Label>Default Pay Day</Label>
                <Select
                  value={organisation.default_pay_day || 'thursday'}
                  onValueChange={(val) => updateOrgField('default_pay_day', val)}
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
                    value={organisation.bank_bsb || ''}
                    onChange={(e) => updateOrgField('bank_bsb', e.target.value)}
                    placeholder="063-000"
                    className="mt-1"
                    maxLength={7}
                  />
                </div>

                <div>
                  <Label htmlFor="bank_account">Business Account Number</Label>
                  <Input
                    id="bank_account"
                    value={organisation.bank_account || ''}
                    onChange={(e) => updateOrgField('bank_account', e.target.value)}
                    placeholder="12345678"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  value={organisation.bank_account_name || ''}
                  onChange={(e) => updateOrgField('bank_account_name', e.target.value)}
                  placeholder="Same as business name"
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-blue-900">
                    <strong>Note:</strong> This account will be used for payroll payments. Ensure
                    you have sufficient funds before running payroll.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userProfile.full_name || ''}
                  onChange={(e) => updateProfileField('full_name', e.target.value)}
                  placeholder="Your full name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userProfile.phone || ''}
                  onChange={(e) => updateProfileField('phone', e.target.value)}
                  placeholder="0412 345 678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Role</Label>
                <Input value={userProfile.role || 'Owner'} disabled className="mt-1 bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">Your role in the organisation</p>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Password</div>
                    <div className="text-sm text-gray-600 mt-1">••••••••</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = '/reset-password')}
                  >
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-blue-900">
                    <strong>Security tip:</strong> Use a strong, unique password and enable
                    two-factor authentication for added security (coming soon).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications (Future) */}
          <div className="bg-white border rounded-lg shadow-sm p-6 opacity-50">
            <div className="flex items-center gap-2 mb-6">
              <Bell size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                Coming Soon
              </span>
            </div>

            <div className="text-sm text-gray-500">
              Email notifications, payment reminders, and compliance alerts will be available here.
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-8">
        <div className="text-sm text-gray-500">
          {lastUpdated && activeTab === 'organisation' && (
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
