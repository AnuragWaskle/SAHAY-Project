import React, { useState, useEffect } from 'react';
import { Building2, FileText, MapPin, Users, CheckCircle, ChevronRight, ChevronLeft, Loader2, Upload, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

const STEPS = [
  { key: 'org', label: 'Organization', icon: Building2 },
  { key: 'docs', label: 'Verification', icon: FileText },
  { key: 'location', label: 'Location & Focus', icon: MapPin },
  { key: 'capacity', label: 'Capacity', icon: Users },
  { key: 'review', label: 'Review & Submit', icon: CheckCircle },
];

const ORG_TYPES = ['NGO', 'Trust', 'Society', 'Foundation', 'Section 8 Company'];

const FOCUS_AREAS = [
  { key: 'sanitation', label: 'Sanitation' },
  { key: 'education', label: 'Education' },
  { key: 'environment', label: 'Environment' },
  { key: 'water', label: 'Water' },
  { key: 'public_safety', label: 'Public Safety' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'waste_management', label: 'Waste Management' },
  { key: 'public_spaces', label: 'Public Spaces' },
  { key: 'disaster_response', label: 'Disaster Response' },
  { key: 'community_development', label: 'Community Development' },
];

interface FormData {
  name: string;
  legal_name: string;
  org_type: string;
  registration_number: string;
  website: string;
  email: string;
  phone: string;
  description: string;
  certificate_file: string;
  representative_name: string;
  representative_designation: string;
  city_id: string;
  operating_areas: string;
  focus_areas: string[];
  volunteer_count: string;
  staff_count: string;
  skills: string;
  previous_initiatives: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  legal_name: '',
  org_type: '',
  registration_number: '',
  website: '',
  email: '',
  phone: '',
  description: '',
  certificate_file: '',
  representative_name: '',
  representative_designation: '',
  city_id: '',
  operating_areas: '',
  focus_areas: [],
  volunteer_count: '',
  staff_count: '',
  skills: '',
  previous_initiatives: '',
};

interface Props {
  onRegistered: () => void;
}

export default function NGORegistration({ onRegistered }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [cities, setCities] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get('/city').then(res => {
      setCities(res.data.data || []);
    }).catch(() => {});
  }, []);

  const updateField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const toggleFocusArea = (key: string) => {
    setForm(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(key)
        ? prev.focus_areas.filter(k => k !== key)
        : [...prev.focus_areas, key],
    }));
  };

  const validateStep = (): boolean => {
    const errors: string[] = [];
    if (step === 0) {
      if (!form.name.trim()) errors.push('Organization name is required');
      if (!form.org_type) errors.push('Organization type is required');
      if (!form.email.trim()) errors.push('Official email is required');
      if (!form.description.trim()) errors.push('Description is required');
    } else if (step === 1) {
      if (!form.representative_name.trim()) errors.push('Representative name is required');
      if (!form.representative_designation.trim()) errors.push('Designation is required');
    } else if (step === 2) {
      if (!form.city_id) errors.push('City selection is required');
      if (form.focus_areas.length === 0) errors.push('Select at least one focus area');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/organizations', {
        type: form.org_type.toLowerCase().replace(/\s+/g, '_'),
        name: form.name,
        registration_number: form.registration_number,
        description: form.description,
        focus_areas: form.focus_areas,
        operating_wards: form.operating_areas ? form.operating_areas.split(',').map(s => s.trim()) : [],
        contact: {
          email: form.email,
          phone: form.phone,
          website: form.website,
          legal_name: form.legal_name,
          representative: form.representative_name,
          representative_designation: form.representative_designation,
          volunteer_count: form.volunteer_count,
          staff_count: form.staff_count,
          skills: form.skills,
          previous_initiatives: form.previous_initiatives,
        },
      });
      setSubmitted(true);
      setTimeout(() => onRegistered(), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="glass p-12 rounded-4xl text-center max-w-lg">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={44} className="text-brand-green" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-3">Registration Submitted!</h2>
          <p className="text-gray-600 font-medium">Your organization application is now under review. You'll be notified once it's approved.</p>
          <div className="mt-6 px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
            <p className="text-yellow-800 text-sm font-medium">Status: <span className="font-bold">Pending Verification</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-dark rounded-4xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-green/20 rounded-full blur-3xl"></div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2 relative z-10">Register Your Organization</h2>
        <p className="text-gray-600 font-medium relative z-10">Complete the form below to get your organization verified on Sahay.</p>
      </div>

      {/* Step Indicator */}
      <div className="glass p-4 rounded-3xl mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
            return (
              <React.Fragment key={s.key}>
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all ${
                    isActive ? 'bg-gradient-to-r from-brand-green to-emerald-500 text-white shadow-lg' :
                    isComplete ? 'bg-green-100 text-green-700' :
                    'text-gray-400'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold hidden lg:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${i < step ? 'bg-brand-green' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200">
          {validationErrors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-red-700 text-sm font-medium">
              <AlertCircle size={14} />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Form Content */}
      <div className="glass p-8 rounded-4xl mb-6">
        {step === 0 && <StepOrganization form={form} updateField={updateField} />}
        {step === 1 && <StepVerification form={form} updateField={updateField} />}
        {step === 2 && <StepLocation form={form} updateField={updateField} cities={cities} toggleFocusArea={toggleFocusArea} />}
        {step === 3 && <StepCapacity form={form} updateField={updateField} />}
        {step === 4 && <StepReview form={form} cities={cities} />}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-medium text-sm">
          {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        {step > 0 ? (
          <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-2xl glass text-gray-700 font-bold hover:bg-white/80 transition-all">
            <ChevronLeft size={18} /> Back
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all">
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────

function StepOrganization({ form, updateField }: { form: FormData; updateField: (f: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Organization Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Organization Name *" value={form.name} onChange={v => updateField('name', v)} placeholder="e.g., Green Earth Foundation" />
        <FormField label="Legal Name" value={form.legal_name} onChange={v => updateField('legal_name', v)} placeholder="As per registration" />
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Organization Type *</label>
          <select
            value={form.org_type}
            onChange={e => updateField('org_type', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
          >
            <option value="">Select type...</option>
            {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <FormField label="Registration Number" value={form.registration_number} onChange={v => updateField('registration_number', v)} placeholder="e.g., MH/2024/12345" />
        <FormField label="Official Email *" value={form.email} onChange={v => updateField('email', v)} placeholder="contact@org.in" type="email" />
        <FormField label="Phone" value={form.phone} onChange={v => updateField('phone', v)} placeholder="+91 9876543210" type="tel" />
        <FormField label="Website" value={form.website} onChange={v => updateField('website', v)} placeholder="https://yourorg.org" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description *</label>
        <textarea
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all h-28 resize-none"
          placeholder="Describe your organization's mission and work..."
        />
      </div>
    </div>
  );
}

function StepVerification({ form, updateField }: { form: FormData; updateField: (f: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Verification Documents</h3>
      <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200 mb-4">
        <p className="text-blue-800 text-sm font-medium">Upload your organization's registration certificate for verification. Our team will review and verify within 2-3 business days.</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Registration Certificate</label>
        <label className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-brand-green hover:bg-green-50/50 transition-all">
          <Upload size={20} className="text-gray-400" />
          <span className="font-medium text-gray-600">
            {form.certificate_file || 'Choose file to upload (PDF, JPG, PNG)'}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) updateField('certificate_file', file.name);
            }}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        <FormField label="Authorized Representative Name *" value={form.representative_name} onChange={v => updateField('representative_name', v)} placeholder="Full name" />
        <FormField label="Designation *" value={form.representative_designation} onChange={v => updateField('representative_designation', v)} placeholder="e.g., Director, President" />
      </div>
    </div>
  );
}

function StepLocation({ form, updateField, cities, toggleFocusArea }: {
  form: FormData; updateField: (f: keyof FormData, v: any) => void;
  cities: any[]; toggleFocusArea: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Location & Focus Areas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Registered City *</label>
          <select
            value={form.city_id}
            onChange={e => updateField('city_id', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
          >
            <option value="">Select city...</option>
            {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
          </select>
        </div>
        <FormField label="Operating Areas / Wards" value={form.operating_areas} onChange={v => updateField('operating_areas', v)} placeholder="e.g., Ward 12, Ward 15, Old City" />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Focus Areas * (select all that apply)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FOCUS_AREAS.map(area => (
            <button
              key={area.key}
              type="button"
              onClick={() => toggleFocusArea(area.key)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                form.focus_areas.includes(area.key)
                  ? 'bg-brand-green text-white border-brand-green shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-green hover:text-brand-green'
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCapacity({ form, updateField }: { form: FormData; updateField: (f: keyof FormData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Organization Capacity</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Volunteer Count" value={form.volunteer_count} onChange={v => updateField('volunteer_count', v)} placeholder="Approximate number" type="number" />
        <FormField label="Staff Count" value={form.staff_count} onChange={v => updateField('staff_count', v)} placeholder="Full-time + part-time" type="number" />
      </div>
      <FormField label="Available Skills" value={form.skills} onChange={v => updateField('skills', v)} placeholder="e.g., Project Management, Environmental Science, Legal Aid" />
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Previous Initiatives / Experience</label>
        <textarea
          value={form.previous_initiatives}
          onChange={e => updateField('previous_initiatives', e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all h-32 resize-none"
          placeholder="Describe your past civic initiatives, partnerships, or community work..."
        />
      </div>
    </div>
  );
}

function StepReview({ form, cities }: { form: FormData; cities: any[] }) {
  const city = cities.find(c => c.id === form.city_id);
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Review Your Application</h3>
      <p className="text-gray-500 font-medium text-sm mb-6">Please review all information before submitting. You can go back to edit any section.</p>

      <ReviewSection title="Organization Info">
        <ReviewRow label="Name" value={form.name} />
        <ReviewRow label="Legal Name" value={form.legal_name || '—'} />
        <ReviewRow label="Type" value={form.org_type} />
        <ReviewRow label="Reg. Number" value={form.registration_number || '—'} />
        <ReviewRow label="Email" value={form.email} />
        <ReviewRow label="Phone" value={form.phone || '—'} />
        <ReviewRow label="Website" value={form.website || '—'} />
      </ReviewSection>

      <ReviewSection title="Verification">
        <ReviewRow label="Certificate" value={form.certificate_file || 'Not uploaded'} />
        <ReviewRow label="Representative" value={`${form.representative_name} (${form.representative_designation})`} />
      </ReviewSection>

      <ReviewSection title="Location & Focus">
        <ReviewRow label="City" value={city ? `${city.name}, ${city.state}` : '—'} />
        <ReviewRow label="Operating Areas" value={form.operating_areas || '—'} />
        <ReviewRow label="Focus Areas" value={form.focus_areas.map(f => FOCUS_AREAS.find(a => a.key === f)?.label || f).join(', ')} />
      </ReviewSection>

      <ReviewSection title="Capacity">
        <ReviewRow label="Volunteers" value={form.volunteer_count || '—'} />
        <ReviewRow label="Staff" value={form.staff_count || '—'} />
        <ReviewRow label="Skills" value={form.skills || '—'} />
      </ReviewSection>

      <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
        <p className="text-yellow-800 text-sm font-medium">By submitting, you confirm that all information provided is accurate. False claims may result in rejection or ban.</p>
      </div>
    </div>
  );
}

// ─── Shared Form Components ──────────────────────────────────

function FormField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
      />
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/70 p-5 rounded-2xl border border-white/80">
      <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-800 font-bold text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
