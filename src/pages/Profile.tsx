import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, PencilLine, ShieldCheck, ShieldAlert, UserRound } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { useAuth } from '@/hooks/useAuth';

const resolveBackendUrl = () => {
  const configured = (import.meta.env.VITE_AUTH_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');

  const { hostname, origin } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  return isLocal ? 'http://localhost:5000' : origin;
};

const BACKEND_URL = resolveBackendUrl();

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  aadhaar_hash: string | null;
  aadhaar_last4: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  alternate_email: string | null;
  occupation: string | null;
  bio: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

type FormData = {
  full_name: string;
  phone: string;
  aadhaar_input: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  alternate_email: string;
  occupation: string;
  bio: string;
};

const emptyForm: FormData = {
  full_name: '',
  phone: '',
  aadhaar_input: '',
  date_of_birth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  country: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  alternate_email: '',
  occupation: '',
  bio: '',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const localProfileKey = (userId: string) => `travelmate-local-profile-${userId}`;

const Profile = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [clearAadhaar, setClearAadhaar] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const metadataDetails = useMemo(
    () => getProfileDetailsFromUser((user as { user_metadata?: unknown } | null)?.user_metadata),
    [(user as { user_metadata?: unknown } | null)?.user_metadata]
  );

  const emailVerified = !!(user as { emailVerified?: boolean } | null)?.emailVerified;
  const phoneVerified = false;

  const loadProfile = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load profile from backend.');
        }

        const data = await response.json();
        const profileData = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || null,
          phone: data.user.user_metadata?.phone || null,
          ...data.user.user_metadata?.profile_details,
        } as ProfileRow;

        setProfile(profileData);
        setFormData(toForm(profileData, data.user.user_metadata?.profile_details || metadataDetails));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load profile.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [metadataDetails]
  );

  useEffect(() => {
    if (!user?.id) return;
    void loadProfile(user.id);
  }, [loadProfile, user?.id]);

  const maskedAadhaar = useMemo(() => {
    const last4 = profile?.aadhaar_last4 || metadataDetails.aadhaar_last4 || '';
    if (!last4) return '';
    return `XXXX-XXXX-${last4}`;
  }, [metadataDetails.aadhaar_last4, profile?.aadhaar_last4]);
  const profileName =
    formData.full_name ||
    ((user as { user_metadata?: { full_name?: string } } | null)?.user_metadata?.full_name as string | undefined) ||
    'User';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  const onEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const onCancel = () => {
    if (!profile) return;
    setFormData(toForm(profile, metadataDetails));
    setClearAadhaar(false);
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const onInputChange = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!user || !profile) return;

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let aadhaarHash = profile.aadhaar_hash;
      let aadhaarLast4 = profile.aadhaar_last4;
      const normalizedAadhaar = formData.aadhaar_input.replace(/\D/g, '');

      if (clearAadhaar) {
        aadhaarHash = null;
        aadhaarLast4 = null;
      } else if (normalizedAadhaar) {
        aadhaarHash = await sha256(normalizedAadhaar);
        aadhaarLast4 = normalizedAadhaar.slice(-4);
      }

      const payload = {
        full_name: formData.full_name.trim(),
        phone: toNullable(formData.phone.trim()),
        aadhaar_hash: aadhaarHash,
        aadhaar_last4: aadhaarLast4,
        date_of_birth: normalizeDateForDb(formData.date_of_birth),
        gender: toNullable(formData.gender),
        address: toNullable(formData.address),
        city: toNullable(formData.city),
        state: toNullable(formData.state),
        country: toNullable(formData.country),
        emergency_contact_name: toNullable(formData.emergency_contact_name),
        emergency_contact_phone: toNullable(formData.emergency_contact_phone),
        alternate_email: toNullable(formData.alternate_email),
        occupation: toNullable(formData.occupation),
        bio: toNullable(formData.bio),
        avatar_path: profile.avatar_path,
      };

      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to update profile.');
      }

      const resData = await response.json();
      const updatedProfileData = {
        id: user.id,
        ...payload,
        created_at: profile.created_at,
        updated_at: new Date().toISOString(),
      } as ProfileRow;

      setProfile(updatedProfileData);
      setFormData(toForm(updatedProfileData, payload));
      setClearAadhaar(false);
      setEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (e) {
      const message = getErrorMessage(e, 'Failed to update profile.');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Unable to send password reset email.');
      }

      setSuccess(`Password reset email sent to ${user.email}.`);
    } catch (e) {
      const message = getErrorMessage(e, 'Failed to send password reset.');
      setError(message);
    }
  };

  const deleteAccountData = async () => {
    if (!user || !profile) return;
    const confirmed = window.confirm(
      'This will delete your profile data and sign you out. Continue?'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to delete account data.');
      }

      await signOut();
      window.location.assign('/');
    } catch (e) {
      const message = getErrorMessage(e, 'Failed to delete account data.');
      setError(message);
      setDeleting(false);
    }
  };

  return (
    <Layout hideFooter>
      <PageTransition>
        <section className="min-h-screen bg-[#1A1A1A] py-10 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[#222222] border border-white/5 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/30 flex items-center justify-center">
                    {profileInitial ? (
                      <span className="text-2xl font-bold text-[#FFC857]">{profileInitial}</span>
                    ) : (
                      <UserRound className="h-7 w-7 text-[#FFC857]" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                    <p className="text-[#B0B0B0] text-sm mt-1">
                      Manage your personal information securely.
                    </p>
                  </div>
                </div>
                {!editing ? (
                  <button
                    onClick={onEdit}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7A00] to-[#FFC857] hover:brightness-110 px-5 py-2.5 rounded-xl font-bold text-white transition active:scale-95 shadow-md shadow-[rgba(255,122,0,0.3)]"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={onCancel}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-60 text-white font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSave}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FFC857] hover:brightness-110 transition disabled:opacity-60 inline-flex items-center gap-2 font-bold text-white active:scale-95 shadow-md shadow-[rgba(255,122,0,0.3)]"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="bg-[#222222] border border-white/5 rounded-3xl p-10 flex items-center justify-center text-white shadow-xl">
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                Loading profile...
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-xl px-4 py-3">
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-[#222222] border border-white/5 rounded-3xl p-6 text-white shadow-xl">
                    <h2 className="text-lg font-bold mb-5 tracking-tight">Personal Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Full Name" value={formData.full_name} onChange={(v) => onInputChange('full_name', v)} editing={editing} required />
                      <Field label="Email" value={user?.email || ''} editing={false} readOnly />
                      <Field label="Phone Number" value={formData.phone} onChange={(v) => onInputChange('phone', v)} editing={editing} placeholder="10 digit number" />
                      <Field label="Date of Birth" value={formData.date_of_birth} onChange={(v) => onInputChange('date_of_birth', v)} editing={editing} type="date" />
                      <SelectField
                        label="Gender"
                        value={formData.gender}
                        onChange={(v) => onInputChange('gender', v)}
                        editing={editing}
                        options={[
                          { value: '', label: 'Select gender' },
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' },
                          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                        ]}
                      />
                      <Field label="Occupation" value={formData.occupation} onChange={(v) => onInputChange('occupation', v)} editing={editing} />
                      <Field label="Aadhaar Number" value={formData.aadhaar_input} onChange={(v) => onInputChange('aadhaar_input', v)} editing={editing} placeholder={maskedAadhaar || '12 digit number'} />
                      <div className="flex items-end pb-2">
                        {editing && (
                          <label className="inline-flex items-center gap-2 text-sm text-[#B0B0B0]">
                            <input
                              type="checkbox"
                              checked={clearAadhaar}
                              onChange={(e) => setClearAadhaar(e.target.checked)}
                              className="rounded border-white/20 bg-white/10 text-[#FF7A00] focus:ring-[#FF7A00]"
                            />
                            Clear stored Aadhaar (kept hashed only)
                          </label>
                        )}
                      </div>
                      <Field label="Address" value={formData.address} onChange={(v) => onInputChange('address', v)} editing={editing} className="md:col-span-2" />
                      <Field label="City" value={formData.city} onChange={(v) => onInputChange('city', v)} editing={editing} />
                      <Field label="State" value={formData.state} onChange={(v) => onInputChange('state', v)} editing={editing} />
                      <Field label="Country" value={formData.country} onChange={(v) => onInputChange('country', v)} editing={editing} />
                      <Field label="Alternate Email" value={formData.alternate_email} onChange={(v) => onInputChange('alternate_email', v)} editing={editing} />
                      <Field label="Emergency Contact Name" value={formData.emergency_contact_name} onChange={(v) => onInputChange('emergency_contact_name', v)} editing={editing} />
                      <Field label="Emergency Contact Phone" value={formData.emergency_contact_phone} onChange={(v) => onInputChange('emergency_contact_phone', v)} editing={editing} placeholder="10 digit number" />
                      <TextAreaField label="Bio (optional)" value={formData.bio} onChange={(v) => onInputChange('bio', v)} editing={editing} className="md:col-span-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#222222] border border-white/5 rounded-3xl p-6 text-white shadow-xl">
                    <h2 className="text-lg font-bold mb-4 tracking-tight">Verification Status</h2>
                    <div className="space-y-3 text-sm">
                      <StatusRow label="Email verification" ok={emailVerified} />
                      <StatusRow label="Phone verification" ok={phoneVerified} />
                    </div>
                  </div>

                  <div className="bg-[#222222] border border-white/5 rounded-3xl p-6 text-white shadow-xl">
                    <h2 className="text-lg font-bold mb-4 tracking-tight">Security Settings</h2>
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={sendPasswordReset}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-semibold"
                      >
                        Send password reset email
                      </button>
                      <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm text-[#B0B0B0] font-medium">
                        Two-factor authentication: optional, not enabled yet.
                      </div>
                      <button
                        type="button"
                        onClick={deleteAccountData}
                        disabled={deleting}
                        className="w-full text-left px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition text-sm font-semibold disabled:opacity-60"
                      >
                        {deleting ? 'Deleting account data...' : 'Delete account data'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  editing: boolean;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
};

const Field = ({
  label,
  value,
  onChange,
  editing,
  required = false,
  readOnly = false,
  placeholder = '',
  type = 'text',
  className = '',
}: FieldProps) => (
  <div className={className}>
    <label className="block text-xs text-gray-300 mb-1">
      {label}
      {required ? ' *' : ''}
    </label>
    <input
      type={type}
      value={value}
      readOnly={!editing || readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full rounded-lg px-3 py-2 text-sm transition ${
        !editing || readOnly
          ? 'bg-white/5 border border-white/10 text-gray-200'
          : 'bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]'
      }`}
    />
  </div>
);

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  options: Array<{ value: string; label: string }>;
};

const SelectField = ({ label, value, onChange, editing, options }: SelectFieldProps) => (
  <div>
    <label className="block text-xs text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      disabled={!editing}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg px-3 py-2 text-sm transition ${
        !editing
          ? 'bg-white/5 border border-white/10 text-gray-200'
          : 'bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]'
      }`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="text-black">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  className?: string;
};

const TextAreaField = ({ label, value, onChange, editing, className = '' }: TextAreaFieldProps) => (
  <div className={className}>
    <label className="block text-xs text-gray-300 mb-1">{label}</label>
    <textarea
      value={value}
      readOnly={!editing}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg px-3 py-2 text-sm transition ${
        !editing
          ? 'bg-white/5 border border-white/10 text-gray-200'
          : 'bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]'
      }`}
    />
  </div>
);

const StatusRow = ({ label, ok }: { label: string; ok: boolean }) => (
  <div className="flex items-center justify-between border border-white/10 rounded-lg px-3 py-2">
    <span>{label}</span>
    <span className={`inline-flex items-center gap-1 ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
      {ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
      {ok ? 'Verified' : 'Pending'}
    </span>
  </div>
);

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDateForDb(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const ddmmyyyy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

function toForm(profile: ProfileRow, metadata?: Partial<ExtendedProfileDetails>): FormData {
  return {
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    aadhaar_input: '',
    date_of_birth: profile.date_of_birth || metadata?.date_of_birth || '',
    gender: profile.gender || metadata?.gender || '',
    address: profile.address || metadata?.address || '',
    city: profile.city || metadata?.city || '',
    state: profile.state || metadata?.state || '',
    country: profile.country || metadata?.country || '',
    emergency_contact_name: profile.emergency_contact_name || metadata?.emergency_contact_name || '',
    emergency_contact_phone: profile.emergency_contact_phone || metadata?.emergency_contact_phone || '',
    alternate_email: profile.alternate_email || metadata?.alternate_email || '',
    occupation: profile.occupation || metadata?.occupation || '',
    bio: profile.bio || metadata?.bio || '',
  };
}

function validateForm(formData: FormData) {
  if (!formData.full_name.trim()) {
    return 'Full name is required.';
  }

  const phone = formData.phone.replace(/\D/g, '');
  if (phone && phone.length !== 10) {
    return 'Phone number must be 10 digits.';
  }

  const emergencyPhone = formData.emergency_contact_phone.replace(/\D/g, '');
  if (emergencyPhone && emergencyPhone.length !== 10) {
    return 'Emergency contact phone must be 10 digits.';
  }

  const aadhaar = formData.aadhaar_input.replace(/\D/g, '');
  if (aadhaar && aadhaar.length !== 12) {
    return 'Aadhaar number must be 12 digits.';
  }

  const altEmail = formData.alternate_email.trim();
  if (altEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(altEmail)) {
    return 'Alternate email format is invalid.';
  }

  if (formData.date_of_birth) {
    const dob = new Date(formData.date_of_birth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return 'Date of birth is invalid.';
    }
  }

  return '';
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isProfileSchemaError(message: string) {
  const lower = message.toLowerCase();
  return (
    (lower.includes('column') && lower.includes('does not exist')) ||
    lower.includes('could not find the') ||
    lower.includes('schema cache')
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}

type ExtendedProfileDetails = Omit<FormData, 'full_name' | 'phone' | 'aadhaar_input'> & {
  aadhaar_last4?: string | null;
  aadhaar_hash?: string | null;
};

function getProfileDetailsFromUser(userMetadata: unknown): Partial<ExtendedProfileDetails> {
  if (!userMetadata || typeof userMetadata !== 'object') {
    return {};
  }

  const details = (userMetadata as { profile_details?: unknown }).profile_details;
  if (!details || typeof details !== 'object') {
    return {};
  }

  return details as Partial<ExtendedProfileDetails>;
}

export default Profile;
