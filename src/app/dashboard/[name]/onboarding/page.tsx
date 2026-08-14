'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Plus, Trash2, Save, X, Building2, CheckCircle2, DollarSign, UploadCloud, ChevronRight, Loader2, Edit2, Eye } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

const SERVICES_LIST = [
  'Digital Marketing', 'CGI Ads', 'Website Development', 'App Development', 
  'AI Bot Automation', 'Social Media Advertising', 'SEO', 'Content Marketing', 
  'Branding & Creative Design', 'Conversion Rate Optimization', 'Amazon', 
  'Flipkart', 'Meesho', 'Myntra'
];

const GOALS_LIST = [
  'More Leads', 'More Sales', 'More Brand Awareness', 'More Website Traffic', 
  'Better Google Rankings', 'More Social Media Followers', 'More App Downloads', 
  'Better Customer Retention'
];

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const verticalName = params.name as string;
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewClient, setViewClient] = useState<any | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPocDropdownOpen, setIsPocDropdownOpen] = useState(false);
  const pocDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pocDropdownRef.current && !pocDropdownRef.current.contains(event.target as Node)) {
        setIsPocDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  type FormState = {
    id?: number | null;
    client_name: string;
    business_name: string;
    business_logo_url: string;
    business_logo_file: File | null;
    phone_numbers: string[];
    emails: string[];
    poc_business: { name: string; phone: string }[];
    poc_our_side: string[];
    pan: string;
    gst: string;
    cin: string;
    website_link: string;
    credentials: any;
    analytics: any;
    social_links: any;
    posting_frequency: string;
    date_of_onboarding: string;
    date_work_started: string;
    date_work_stopped: string;
    provided_services: string[];
    industry: string;
    products_services_offered: string;
    target_location: string;
    competitors: string;
    usp: string;
    business_goals: string[];
    custom_notes: string;
    payments: { id?: number; payment_date: string, transaction_number: string, method: string, proof_file?: File | null, proof_url: string }[];
  };

  const initialFormState: FormState = {
    id: null,
    client_name: '',
    business_name: '',
    business_logo_url: '',
    business_logo_file: null,
    phone_numbers: [''],
    emails: [''],
    poc_business: [{ name: '', phone: '' }],
    poc_our_side: [],
    pan: '',
    gst: '',
    cin: '',
    website_link: '',
    credentials: {
      login: { link: '', username: '', password: '' },
      hosting: { link: '', username: '', password: '' },
      domain: { link: '', username: '', password: '' }
    },
    analytics: {
      google_analytics: { link: '', username: '', password: '' },
      search_console: { link: '', username: '', password: '' },
      fb_pixel: { link: '', username: '', password: '' },
      meta_business: { link: '', username: '', password: '' },
      others: [] as { platform: string, link: string, username: string, password: string }[]
    },
    social_links: {
      facebook: { link: '', username: '', password: '' },
      insta: { link: '', username: '', password: '' },
      linkedin: { link: '', username: '', password: '' },
      youtube: { link: '', username: '', password: '' },
      twitter: { link: '', username: '', password: '' },
      gmb: { link: '', username: '', password: '' },
      others: [] as { platform: string, link: string, username: string, password: string }[]
    },
    posting_frequency: '',
    date_of_onboarding: '',
    date_work_started: '',
    date_work_stopped: '',
    provided_services: [] as string[],
    industry: '',
    products_services_offered: '',
    target_location: '',
    competitors: '',
    usp: '',
    business_goals: [] as string[],
    custom_notes: '',
    payments: [] as { payment_date: string, transaction_number: string, method: string, proof_file: File | null, proof_url: string }[]
  };

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [portalPassword, setPortalPassword] = useState<string>('');

  const generatePortalPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i <= 10; i++) {
      const randomNumber = Math.floor(Math.random() * chars.length);
      password += chars.substring(randomNumber, randomNumber + 1);
    }
    setPortalPassword(password);
  };

  const copyPortalCredentials = (e: React.MouseEvent) => {
    e.preventDefault();
    const email = formData.emails[0] || 'No email set';
    const text = `Login URL: ${window.location.origin}/login\nUser ID (Email): ${email}\nPassword: ${portalPassword}`;
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  // Fetch Clients for List
  const { data: clients, isLoading: isClientsLoading } = useQuery({
    queryKey: ['verticalClientsList', verticalName],
    queryFn: async () => {
      const { data: verticalData } = await supabase
        .from('verticals')
        .select('id')
        .ilike('name', verticalName)
        .single();
      
      if (!verticalData) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*, client_verticals!inner(vertical_id), client_payments(*)')
        .eq('client_verticals.vertical_id', verticalData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch Users for POC Dropdown
  const { data: usersList } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      return data.filter((u: any) => u.role !== 'client');
    }
  });

  // Check if current user is Director
  const { data: isDirector } = useQuery({
    queryKey: ['isDirectorCheck'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_roles(role:roles(name))')
        .eq('id', session.user.id)
        .single();
      const roles = profileData?.user_roles?.map((ur: any) => ur.role?.name) || [];
      return roles.includes('Director');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verticalClientsList', verticalName] });
    }
  });

  const handleEditClient = (client: any) => {
    if (lastSaved) {
      if (!confirm('You have an unsaved draft. Loading this client will overwrite your draft. Continue?')) {
        return;
      }
    }
    
    // Transform client data back to formData structure
    setFormData({
      id: client.id,
      client_name: client.client_name || '',
      business_name: client.business_name || '',
      business_logo_url: client.business_logo_url || '',
      business_logo_file: null,
      phone_numbers: client.phone_numbers?.length ? client.phone_numbers : [''],
      emails: client.emails?.length ? client.emails : [''],
      poc_business: Array.isArray(client.poc_business) && client.poc_business.length 
        ? client.poc_business.map((p: any) => typeof p === 'string' ? { name: p, phone: '' } : p)
        : [{ name: '', phone: '' }],
      poc_our_side: Array.isArray(client.poc_our_side) ? client.poc_our_side : [],
      pan: client.pan || '',
      gst: client.gst || '',
      cin: client.cin || '',
      website_link: client.website_link || '',
      credentials: client.credentials || initialFormState.credentials,
      analytics: client.analytics || initialFormState.analytics,
      social_links: client.social_links || initialFormState.social_links,
      posting_frequency: client.posting_frequency || '',
      date_of_onboarding: client.date_of_onboarding || '',
      date_work_started: client.date_work_started || '',
      date_work_stopped: client.date_work_stopped || '',
      provided_services: client.provided_services || [],
      industry: client.industry || '',
      products_services_offered: client.products_services_offered || '',
      target_location: client.target_location || '',
      competitors: client.competitors || '',
      usp: client.usp || '',
      business_goals: client.business_goals || [],
      custom_notes: client.custom_notes || '',
      payments: client.client_payments?.map((p: any) => ({
        id: p.id,
        payment_date: p.payment_date || '',
        transaction_number: p.transaction_number || '',
        method: p.method || '',
        proof_url: p.proof_url || '',
        proof_file: null
      })) || []
    });
    setIsFormOpen(true);
  };

  // Draft Auto-loading
  useEffect(() => {
    const saved = localStorage.getItem(`onboardingDraft_${verticalName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.poc_business === 'string') {
          parsed.poc_business = parsed.poc_business ? [{ name: parsed.poc_business, phone: '' }] : [{ name: '', phone: '' }];
        } else if (Array.isArray(parsed.poc_business) && parsed.poc_business.length > 0 && typeof parsed.poc_business[0] === 'string') {
          parsed.poc_business = parsed.poc_business.map((p: any) => ({ name: p, phone: '' }));
        }
        if (typeof parsed.poc_our_side === 'string') {
          parsed.poc_our_side = parsed.poc_our_side ? [parsed.poc_our_side] : [];
        }
        setFormData(parsed);
      } catch (e) {}
    }
  }, [verticalName]);

  const saveDraftNow = () => {
    const draftData = {
      ...formData,
      business_logo_file: null,
      payments: formData.payments.map((p) => ({ ...p, proof_file: null }))
    };
    localStorage.setItem(`onboardingDraft_${verticalName}`, JSON.stringify(draftData));
    setLastSaved(new Date());
  };

  // Draft Auto-saving
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftNow();
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, verticalName]);

  const discardDraft = () => {
    localStorage.removeItem(`onboardingDraft_${verticalName}`);
    setFormData(initialFormState);
    setLastSaved(null);
  };

  // Dynamic Array Handlers
  const addArrayItem = (field: 'phone_numbers' | 'emails') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };
  const updateArrayItem = (field: 'phone_numbers' | 'emails', index: number, value: string) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData({ ...formData, [field]: newArr });
  };
  const removeArrayItem = (field: 'phone_numbers' | 'emails', index: number) => {
    const newArr = formData[field].filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, [field]: newArr });
  };

  const addPocBusiness = () => {
    setFormData({ ...formData, poc_business: [...formData.poc_business, { name: '', phone: '' }] });
  };
  const updatePocBusiness = (index: number, key: 'name' | 'phone', value: string) => {
    const newArr = [...formData.poc_business];
    newArr[index] = { ...newArr[index], [key]: value };
    setFormData({ ...formData, poc_business: newArr });
  };
  const removePocBusiness = (index: number) => {
    const newArr = formData.poc_business.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, poc_business: newArr });
  };

  const toggleCheckbox = (field: 'provided_services' | 'business_goals', value: string) => {
    const current = formData[field];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  const addPayment = () => {
    setFormData({
      ...formData,
      payments: [...formData.payments, { payment_date: '', transaction_number: '', method: '', proof_file: null, proof_url: '' }]
    });
  };
  const updatePayment = (index: number, key: string, value: string) => {
    const newPayments = [...formData.payments];
    newPayments[index] = { ...newPayments[index], [key]: value };
    setFormData({ ...formData, payments: newPayments });
  };
  const removePayment = (index: number) => {
    setFormData({ ...formData, payments: formData.payments.filter((_: any, i: number) => i !== index) });
  };

  const addOtherLink = (category: 'analytics' | 'social_links') => {
    setFormData({
      ...formData,
      [category]: {
        ...formData[category],
        others: [...formData[category].others, { platform: '', link: '', username: '', password: '' }]
      }
    });
  };
  const updateOtherLink = (category: 'analytics' | 'social_links', index: number, key: string, value: string) => {
    const newOthers = [...formData[category].others];
    newOthers[index] = { ...newOthers[index], [key]: value };
    setFormData({
      ...formData,
      [category]: { ...formData[category], others: newOthers }
    });
  };
  const removeOtherLink = (category: 'analytics' | 'social_links', index: number) => {
    setFormData({
      ...formData,
      [category]: {
        ...formData[category],
        others: formData[category].others.filter((_: any, i: number) => i !== index)
      }
    });
  };

  // Submit Logic
  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Get Vertical ID
      const { data: verticalData, error: verticalError } = await supabase
        .from('verticals')
        .select('id')
        .ilike('name', verticalName)
        .single();
      
      if (verticalError) throw new Error('Could not find vertical.');

      // 1.5 Handle Business Logo Upload
      let uploadedLogoUrl = formData.business_logo_url;
      if (formData.business_logo_file) {
        const fileExt = formData.business_logo_file.name.split('.').pop();
        const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-logos')
          .upload(fileName, formData.business_logo_file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('client-logos')
          .getPublicUrl(fileName);
          
        uploadedLogoUrl = publicUrlData.publicUrl;
      }

      // 2. Auth User Creation for Portal
      let newAuthUserId = formData.id ? undefined : null;
      if (portalPassword && formData.emails[0]) {
        try {
          const authRes = await fetch('/api/clients/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: formData.emails[0], 
              password: portalPassword,
              fullName: formData.client_name
            })
          });
          const authData = await authRes.json();
          if (!authRes.ok) throw new Error(authData.error || 'Failed to generate auth user');
          newAuthUserId = authData.user.id;
        } catch (err: any) {
          throw new Error('Auth User Creation Failed: ' + err.message);
        }
      }

      // 3. Insert or Update Client
      const payload: any = {
        client_name: formData.client_name,
        business_name: formData.business_name,
        business_logo_url: uploadedLogoUrl,
        phone_numbers: formData.phone_numbers.filter(Boolean),
        emails: formData.emails.filter(Boolean),
        poc_business: formData.poc_business.filter(p => p.name || p.phone),
        poc_our_side: formData.poc_our_side,
        pan: formData.pan,
        gst: formData.gst,
        cin: formData.cin,
        website_link: formData.website_link,
        credentials: formData.credentials,
        analytics: formData.analytics,
        social_links: formData.social_links,
        posting_frequency: formData.posting_frequency,
        date_of_onboarding: formData.date_of_onboarding || null,
        date_work_started: formData.date_work_started || null,
        date_work_stopped: formData.date_work_stopped || null,
        provided_services: formData.provided_services,
        industry: formData.industry,
        products_services_offered: formData.products_services_offered,
        target_location: formData.target_location,
        competitors: formData.competitors,
        usp: formData.usp,
        business_goals: formData.business_goals,
        custom_notes: formData.custom_notes
      };

      if (newAuthUserId) {
        payload.auth_user_id = newAuthUserId;
      }


      let clientData;

      if (formData.id) {
        // UPDATE
        const { data, error: clientError } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', formData.id)
          .select()
          .single();
        if (clientError) throw clientError;
        clientData = data;

        // Clear existing payments for complete replacement
        await supabase.from('client_payments').delete().eq('client_id', formData.id);
      } else {
        // INSERT
        const { data, error: clientError } = await supabase
          .from('clients')
          .insert(payload)
          .select()
          .single();
        if (clientError) throw clientError;
        clientData = data;

        // Link Client to Vertical
        const { error: linkError } = await supabase
          .from('client_verticals')
          .insert({
            client_id: clientData.id,
            vertical_id: verticalData.id
          });
        if (linkError) throw linkError;
      }

      // 4. Insert Payments
      if (formData.payments.length > 0) {
        const validPayments = formData.payments.filter(p => p.payment_date && p.method);
        if (validPayments.length > 0) {
          
          // Process file uploads first
          const processedPayments = await Promise.all(validPayments.map(async (p) => {
            let uploadedProofUrl = p.proof_url || '';
            
            if (p.proof_file) {
              const fileExt = p.proof_file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(fileName, p.proof_file);
                
              if (uploadError) {
                console.error('Error uploading payment proof:', uploadError);
                throw uploadError;
              }
              
              const { data: publicUrlData } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(fileName);
                
              uploadedProofUrl = publicUrlData.publicUrl;
            }

            return {
              client_id: clientData.id,
              payment_date: p.payment_date,
              transaction_number: p.transaction_number,
              method: p.method,
              proof_url: uploadedProofUrl
            };
          }));

          const { error: paymentError } = await supabase.from('client_payments').insert(processedPayments);
          if (paymentError) throw paymentError;
        }
      }

      return clientData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['verticals'] });
      queryClient.invalidateQueries({ queryKey: ['verticalClients', verticalName] });
      queryClient.invalidateQueries({ queryKey: ['onboarding_clients', verticalName] });
      setIsFormOpen(false);
      discardDraft();
      router.push(`/dashboard/${verticalName}/client/${data.id}`);
    }
  });

  return (
    <div className="w-full h-full p-2 md:p-3 bg-slate-50 min-h-screen">
      <div className="w-full space-y-2">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="bg-slate-200 text-slate-900 px-3 py-1 rounded-lg text-xl uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-2">
                <UserPlus className="size-5" />
                Onboard a Client
              </span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm capitalize">
              Add new clients to the {verticalName} pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFormOpen && (
              <button 
                onClick={() => submitMutation.mutate()} 
                disabled={submitMutation.isPending || !formData.client_name || !formData.business_name} 
                className="h-10 px-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
                {submitMutation.isPending ? 'Saving...' : 'Complete'}
              </button>
            )}
            <button 
              onClick={() => {
                if (!isFormOpen) {
                  discardDraft();
                }
                setIsFormOpen(!isFormOpen);
              }}
              className={`h-10 px-3 font-bold rounded-lg text-sm shadow-sm transition-all flex items-center gap-2 ${
                isFormOpen 
                  ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' 
                  : 'bg-slate-900 text-white hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin'
              }`}
            >
              {isFormOpen ? <X className="size-4" /> : <Plus className="size-4" />}
              {isFormOpen ? 'Cancel' : 'Onboard a Client'}
            </button>
          </div>
        </div>

        {/* Client List */}
        {!isFormOpen && (
          <div className="space-y-2">
            {isClientsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Loader2 className="size-8 animate-spin mb-3" />
                <p className="text-sm font-medium">Loading clients...</p>
              </div>
            ) : clients && clients.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="px-3 py-3">Client Name</th>
                        <th className="px-3 py-3">Business</th>
                        <th className="px-3 py-3">Industry</th>
                        <th className="px-3 py-3">Onboarded</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients.map((client: any) => (
                        <tr 
                          key={client.id} 
                          onClick={() => setViewClient(client)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-3 font-bold text-slate-800">{client.client_name}</td>
                          <td className="px-3 py-3 text-slate-600">{client.business_name}</td>
                          <td className="px-3 py-3 text-slate-600">
                            {client.industry ? (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{client.industry}</span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {client.date_of_onboarding ? new Date(client.date_of_onboarding).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setViewClient(client); }}
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="size-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                title="Edit Client"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              {isDirector && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to permanently delete this client? This cannot be undone.')) {
                                      deleteMutation.mutate(client.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete Client"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                <Building2 className="size-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">No clients yet</h3>
                <p className="text-sm text-slate-500 mb-3 max-w-sm">Get started by onboarding your first client. All their details, credentials, and payments will be tracked here.</p>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="h-10 px-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-[linear-gradient(45deg,#01C3CC,#7D2AE8,#01C3CC)] hover:bg-[length:200%_200%] hover:animate-border-spin text-sm shadow-sm transition-all"
                >
                  Onboard First Client
                </button>
              </div>
            )}
          </div>
        )}

        {/* Massive Onboarding Form */}
        {isFormOpen && (
          <div className="relative max-w-4xl mx-auto mt-4 mb-8">
            {/* Decorative background cards to show stack */}
            {currentStep < 7 && <div className="absolute inset-0 bg-slate-50 border border-slate-200 rounded-xl z-0 shadow-md translate-y-2 scale-[0.99] transition-all duration-300" />}
            {currentStep < 6 && <div className="absolute inset-0 bg-slate-100 border border-slate-200 rounded-xl z-0 shadow-sm translate-y-4 scale-[0.98] transition-all duration-300" />}
            
            <div className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
            <div className="bg-slate-900 px-3 py-3 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-full bg-slate-800 border border-slate-700 text-white font-bold text-sm shrink-0">
                  {currentStep}/7
                </div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  {
                    currentStep === 1 ? 'Basic Information' :
                    currentStep === 2 ? 'Business & Compliance' :
                    currentStep === 3 ? 'Credentials & Links' :
                    currentStep === 4 ? 'Services & Timeline' :
                    currentStep === 5 ? 'Company & Market Analysis' :
                    currentStep === 6 ? 'Initial Payments' :
                    'Custom Notes & Instructions'
                  }
                </h2>
              </div>
            </div>

            <div className="p-3 md:p-3 space-y-2">
              
              {/* Section 1: Basic Information */}
              {currentStep === 1 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">1. Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Client Full Name *</label>
                    <input type="text" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-500 outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Business Name *</label>
                    <input type="text" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-500 outline-none transition-all" placeholder="Acme Corp" />
                  </div>
                  
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      Phone Numbers
                      <button onClick={() => addArrayItem('phone_numbers')} className="text-slate-900 hover:underline text-[10px]">+ Add More</button>
                    </label>
                    {formData.phone_numbers.map((phone, idx) => (
                      <div key={`phone-${idx}`} className="flex gap-2">
                        <input type="text" value={phone} onChange={e => updateArrayItem('phone_numbers', idx, e.target.value)} className="flex-1 h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="+1 234 567 8900" />
                        {idx > 0 && <button onClick={() => removeArrayItem('phone_numbers', idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      Email Addresses
                      <button onClick={() => addArrayItem('emails')} className="text-slate-900 hover:underline text-[10px]">+ Add More</button>
                    </label>
                    {formData.emails.map((email, idx) => (
                      <div key={`email-${idx}`} className="flex gap-2">
                        <input type="email" value={email} onChange={e => updateArrayItem('emails', idx, e.target.value)} className="flex-1 h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="contact@acme.com" />
                        {idx > 0 && <button onClick={() => removeArrayItem('emails', idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      Point of Contact (Business Side)
                      <button type="button" onClick={addPocBusiness} className="text-slate-900 hover:underline text-[10px]">+ Add More</button>
                    </label>
                    {formData.poc_business.map((poc, idx) => (
                      <div key={`poc_biz-${idx}`} className="flex gap-2">
                        <input type="text" value={poc.name} onChange={e => updatePocBusiness(idx, 'name', e.target.value)} className="flex-[2] h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="Jane Smith" />
                        <input type="text" value={poc.phone} onChange={e => updatePocBusiness(idx, 'phone', e.target.value)} className="flex-1 h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="Phone" />
                        {idx > 0 && <button type="button" onClick={() => removePocBusiness(idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="size-4" /></button>}
                      </div>
                    ))}
                  </div>

                  <div ref={pocDropdownRef} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      Point of Contact (Our Side)
                    </label>
                    
                    <button 
                      type="button"
                      onClick={() => setIsPocDropdownOpen(!isPocDropdownOpen)}
                      className="w-full h-10 px-3 bg-white rounded-lg border border-slate-200 text-sm text-left flex items-center justify-between focus:ring-2 focus:ring-slate-900/20 outline-none shadow-sm transition-all"
                    >
                      <span className="truncate">
                        {formData.poc_our_side.length > 0 
                          ? formData.poc_our_side.join(', ') 
                          : <span className="text-slate-400">Select team members...</span>}
                      </span>
                      <ChevronRight className={`size-4 text-slate-400 transition-transform ${isPocDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isPocDropdownOpen && (
                      <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-md z-50 overflow-hidden ring-1 ring-black/5 relative">
                        {usersList ? (
                          <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {usersList.map((u: any) => (
                              <label key={u.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="rounded text-slate-900 focus:ring-slate-900 size-4 border-slate-300"
                                  checked={formData.poc_our_side.includes(u.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({...formData, poc_our_side: [...formData.poc_our_side, u.name]});
                                    } else {
                                      setFormData({...formData, poc_our_side: formData.poc_our_side.filter(name => name !== u.name)});
                                    }
                                  }}
                                />
                                <span className="font-medium">{u.name}</span>
                                {u.role === 'admin' && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded ml-auto">Admin</span>}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic p-3 text-center flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" /> Loading users...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
              )}

              {/* Section 2: Business & Compliance */}
              {currentStep === 2 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Business & Compliance</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">PAN Number</label>
                    <input type="text" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none uppercase" placeholder="ABCDE1234F" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">GST Number</label>
                    <input type="text" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none uppercase" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">CIN Number</label>
                    <input type="text" value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none uppercase" placeholder="U12345MH2023PTC123456" />
                  </div>
                  <div className="col-span-1 md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Business Logo</label>
                    <div className="flex items-start gap-2">
                      {/* Logo Preview */}
                      <div className="size-20 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden relative group">
                        {formData.business_logo_url || formData.business_logo_file ? (
                          <>
                            <img 
                              src={formData.business_logo_file ? URL.createObjectURL(formData.business_logo_file) : formData.business_logo_url} 
                              alt="Logo" 
                              className="w-full h-full object-contain p-2" 
                              onError={(e) => e.currentTarget.style.display = 'none'} 
                            />
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, business_logo_file: null, business_logo_url: ''})}
                              className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex transition-all"
                            >
                              <Trash2 className="size-5 text-white" />
                            </button>
                          </>
                        ) : (
                          <Building2 className="size-8 text-slate-300" />
                        )}
                      </div>
                      
                      {/* Uploader */}
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-2 pb-3">
                            <UploadCloud className="size-5 text-slate-400 mb-1" />
                            <p className="text-xs text-slate-500 font-medium">Click to upload logo</p>
                            <p className="text-[10px] text-slate-400">PNG, JPG, SVG or PDF</p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".png,.jpg,.jpeg,.svg,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData({...formData, business_logo_file: file});
                              }
                            }}
                          />
                        </label>
                        {formData.business_logo_file && (
                          <p className="text-[10px] text-slate-900 mt-1 font-medium flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Selected: {formData.business_logo_file.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {/* Section 3: Credentials & Links */}
              {currentStep === 3 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. Credentials & Links</h3>
                </div>

                {/* Client Portal Credentials Generator */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-3">
                  <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2"><UserPlus className="size-4" /> Client Portal Credentials</h4>
                  <p className="text-xs text-emerald-700">Generate a unique password so this client can log in to their dashboard at /client-portal.</p>
                  
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={generatePortalPassword} className="h-9 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                      Generate Password
                    </button>
                    {portalPassword && (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" readOnly value={portalPassword} className="h-9 px-3 w-full bg-white border border-emerald-200 rounded-lg text-sm text-slate-900 font-mono" />
                        <button type="button" onClick={copyPortalCredentials} className="h-9 px-3 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap">
                          Copy Credentials
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                
                <div className="space-y-1.5 mb-3">
                  <label className="text-xs font-bold text-slate-700">Website Link</label>
                  <input type="url" value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="https://www.acme.com" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  {/* Login Credentials */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><ChevronRight className="size-4 text-slate-700" /> Web Login Credentials</h4>
                    <input type="text" value={formData.credentials.login.link} onChange={e => setFormData({...formData, credentials: {...formData.credentials, login: {...formData.credentials.login, link: e.target.value}}})} placeholder="Login URL (wp-admin etc)" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.login.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, login: {...formData.credentials.login, username: e.target.value}}})} placeholder="Username / Email" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.login.password} onChange={e => setFormData({...formData, credentials: {...formData.credentials, login: {...formData.credentials.login, password: e.target.value}}})} placeholder="Password" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                  </div>

                  {/* Hosting Credentials */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><ChevronRight className="size-4 text-slate-700" /> Hosting Credentials</h4>
                    <input type="text" value={formData.credentials.hosting.link} onChange={e => setFormData({...formData, credentials: {...formData.credentials, hosting: {...formData.credentials.hosting, link: e.target.value}}})} placeholder="Hosting URL" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.hosting.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, hosting: {...formData.credentials.hosting, username: e.target.value}}})} placeholder="Username / Email" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.hosting.password} onChange={e => setFormData({...formData, credentials: {...formData.credentials, hosting: {...formData.credentials.hosting, password: e.target.value}}})} placeholder="Password" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                  </div>

                  {/* Domain Credentials */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><ChevronRight className="size-4 text-slate-700" /> Domain Credentials</h4>
                    <input type="text" value={formData.credentials.domain.link} onChange={e => setFormData({...formData, credentials: {...formData.credentials, domain: {...formData.credentials.domain, link: e.target.value}}})} placeholder="Domain Registrar URL" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.domain.username} onChange={e => setFormData({...formData, credentials: {...formData.credentials, domain: {...formData.credentials.domain, username: e.target.value}}})} placeholder="Username / Email" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                    <input type="text" value={formData.credentials.domain.password} onChange={e => setFormData({...formData, credentials: {...formData.credentials, domain: {...formData.credentials.domain, password: e.target.value}}})} placeholder="Password" className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-3">
                  {/* Analytics */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-sm text-slate-800">Analytics Access</h4>
                      <button onClick={() => addOtherLink('analytics')} className="text-slate-900 hover:underline text-[10px] font-bold">+ Add Other Analytics</button>
                    </div>
                    <div className="space-y-2">
                      {['google_analytics', 'search_console', 'fb_pixel', 'meta_business'].map(platform => (
                        <div key={platform} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                          <div className="text-xs font-bold text-slate-600 capitalize md:col-span-1">{platform.replace('_', ' ')}</div>
                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" value={(formData.analytics as any)[platform].link} onChange={e => setFormData({...formData, analytics: {...formData.analytics, [platform]: {...(formData.analytics as any)[platform], link: e.target.value}}})} placeholder="Profile Link" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={(formData.analytics as any)[platform].username} onChange={e => setFormData({...formData, analytics: {...formData.analytics, [platform]: {...(formData.analytics as any)[platform], username: e.target.value}}})} placeholder="User ID / Email" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={(formData.analytics as any)[platform].password} onChange={e => setFormData({...formData, analytics: {...formData.analytics, [platform]: {...(formData.analytics as any)[platform], password: e.target.value}}})} placeholder="Password" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                          </div>
                        </div>
                      ))}
                      {formData.analytics.others.map((item: any, idx: number) => (
                        <div key={`analytics-other-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-100/50 p-3 rounded-xl border border-slate-200 items-center relative">
                          <input type="text" value={item.platform} onChange={e => updateOtherLink('analytics', idx, 'platform', e.target.value)} placeholder="Platform Name" className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-bold md:col-span-1" />
                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2 pr-8">
                            <input type="text" value={item.link} onChange={e => updateOtherLink('analytics', idx, 'link', e.target.value)} placeholder="Profile Link" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={item.username} onChange={e => updateOtherLink('analytics', idx, 'username', e.target.value)} placeholder="User ID / Email" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={item.password} onChange={e => updateOtherLink('analytics', idx, 'password', e.target.value)} placeholder="Password" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                          </div>
                          <button onClick={() => removeOtherLink('analytics', idx)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-slate-100"><Trash2 className="size-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Socials */}
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-sm text-slate-800">Social Links & Passwords</h4>
                      <button onClick={() => addOtherLink('social_links')} className="text-slate-900 hover:underline text-[10px] font-bold">+ Add Other Socials</button>
                    </div>
                    <div className="space-y-2">
                      {['facebook', 'insta', 'linkedin', 'youtube', 'twitter', 'gmb'].map(platform => (
                        <div key={platform} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                          <div className="text-xs font-bold text-slate-600 capitalize md:col-span-1">{platform === 'gmb' ? 'Google My Business' : platform}</div>
                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" value={(formData.social_links as any)[platform].link} onChange={e => setFormData({...formData, social_links: {...formData.social_links, [platform]: {...(formData.social_links as any)[platform], link: e.target.value}}})} placeholder="Profile Link" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={(formData.social_links as any)[platform].username} onChange={e => setFormData({...formData, social_links: {...formData.social_links, [platform]: {...(formData.social_links as any)[platform], username: e.target.value}}})} placeholder="User ID / Email" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={(formData.social_links as any)[platform].password} onChange={e => setFormData({...formData, social_links: {...formData.social_links, [platform]: {...(formData.social_links as any)[platform], password: e.target.value}}})} placeholder="Password" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                          </div>
                        </div>
                      ))}
                      {formData.social_links.others.map((item: any, idx: number) => (
                        <div key={`social-other-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-100/50 p-3 rounded-xl border border-slate-200 items-center relative">
                          <input type="text" value={item.platform} onChange={e => updateOtherLink('social_links', idx, 'platform', e.target.value)} placeholder="Platform Name" className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-bold md:col-span-1" />
                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2 pr-8">
                            <input type="text" value={item.link} onChange={e => updateOtherLink('social_links', idx, 'link', e.target.value)} placeholder="Profile Link" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={item.username} onChange={e => updateOtherLink('social_links', idx, 'username', e.target.value)} placeholder="User ID / Email" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                            <input type="text" value={item.password} onChange={e => updateOtherLink('social_links', idx, 'password', e.target.value)} placeholder="Password" className="w-full h-8 px-2 rounded border border-slate-200 text-xs" />
                          </div>
                          <button onClick={() => removeOtherLink('social_links', idx)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-slate-100"><Trash2 className="size-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              )}

              {/* Section 4: Services & Project Timeline */}
              {currentStep === 4 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">4. Services & Timeline</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date of Onboarding</label>
                    <input type="date" value={formData.date_of_onboarding} onChange={e => setFormData({...formData, date_of_onboarding: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date Work Started</label>
                    <input type="date" value={formData.date_work_started} onChange={e => setFormData({...formData, date_work_started: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date Work Stopped</label>
                    <input type="date" value={formData.date_work_stopped} onChange={e => setFormData({...formData, date_work_stopped: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Posting Frequency Required</label>
                    <input type="text" value={formData.posting_frequency} onChange={e => setFormData({...formData, posting_frequency: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="e.g. 3 posts/week" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-bold text-slate-800">What kind of work are we providing?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SERVICES_LIST.map(service => (
                      <label key={service} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${formData.provided_services.includes(service) ? 'border-slate-500 bg-slate-100' : 'border-slate-200 hover:border-slate-200 bg-white'}`}>
                        <input type="checkbox" className="mt-1 accent-emerald-600" checked={formData.provided_services.includes(service)} onChange={() => toggleCheckbox('provided_services', service)} />
                        <span className="text-xs font-medium text-slate-700 leading-snug">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
              )}

              {/* Section 5: Company & Goals */}
              {currentStep === 5 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">5. Company & Market Analysis</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Industry</label>
                    <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="e.g. Real Estate, E-commerce" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Location</label>
                    <input type="text" value={formData.target_location} onChange={e => setFormData({...formData, target_location: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none" placeholder="e.g. Mumbai, Pan India" />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Products or Services Client Offers</label>
                    <textarea value={formData.products_services_offered} onChange={e => setFormData({...formData, products_services_offered: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none min-h-[80px]" placeholder="Detailed list of products/services..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Competitors</label>
                    <textarea value={formData.competitors} onChange={e => setFormData({...formData, competitors: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none min-h-[80px]" placeholder="List of direct competitors..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">USP (Unique Selling Proposition)</label>
                    <textarea value={formData.usp} onChange={e => setFormData({...formData, usp: e.target.value})} className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none min-h-[80px]" placeholder="What makes them different?" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-bold text-slate-800">Business Goals - What are they trying to achieve?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {GOALS_LIST.map(goal => (
                      <label key={goal} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${formData.business_goals.includes(goal) ? 'border-slate-500 bg-slate-100' : 'border-slate-200 hover:border-slate-200 bg-white'}`}>
                        <input type="checkbox" className="mt-1 accent-amber-600" checked={formData.business_goals.includes(goal)} onChange={() => toggleCheckbox('business_goals', goal)} />
                        <span className="text-xs font-medium text-slate-700 leading-snug">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
              )}

              {/* Section 6: Payments */}
              {currentStep === 6 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">6. Initial Payments</h3>
                  <button onClick={addPayment} className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1">
                    <Plus className="size-3" /> Add Payment Record
                  </button>
                </div>

                {formData.payments.length === 0 ? (
                  <div className="text-center py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <DollarSign className="size-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No payment records added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.payments.map((payment, idx) => (
                      <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="w-full md:w-32 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                          <input type="date" value={payment.payment_date} onChange={e => updatePayment(idx, 'payment_date', e.target.value)} className="w-full h-9 px-2 text-xs rounded border border-slate-200 outline-none focus:border-slate-500" />
                        </div>
                        <div className="w-full md:flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction No.</label>
                          <input type="text" value={payment.transaction_number} onChange={e => updatePayment(idx, 'transaction_number', e.target.value)} placeholder="Txn ID" className="w-full h-9 px-2 text-xs rounded border border-slate-200 outline-none focus:border-slate-500" />
                        </div>
                        <div className="w-full md:w-48 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Method</label>
                          <select value={payment.method} onChange={e => updatePayment(idx, 'method', e.target.value)} className="w-full h-9 px-2 text-xs rounded border border-slate-200 outline-none focus:border-slate-500 bg-white">
                            <option value="">Select Method</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Cash">Cash</option>
                          </select>
                        </div>
                        <div className="w-full md:flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><UploadCloud className="size-3" /> Proof Image</label>
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0] || null;
                            updatePayment(idx, 'proof_file', file as any);
                          }} className="w-full h-9 px-2 pt-1 text-xs rounded border border-slate-200 outline-none focus:border-slate-500 bg-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-100 file:text-slate-900 hover:file:bg-slate-200" />
                          {payment.proof_file && <div className="text-[10px] text-slate-900 truncate mt-1">Ready: {payment.proof_file.name}</div>}
                        </div>
                        <div className="w-full md:w-auto pt-5">
                          <button onClick={() => removePayment(idx)} className="h-9 px-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors w-full md:w-auto">
                            <Trash2 className="size-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              )}

              {/* Section 7: Notes */}
              {currentStep === 7 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7. Custom Notes & Instructions</h3>
                </div>
                <textarea 
                  value={formData.custom_notes} 
                  onChange={e => setFormData({...formData, custom_notes: e.target.value})} 
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/20 outline-none min-h-[120px] bg-slate-50" 
                  placeholder="Any specific instructions, deadlines, or expectations from the client..." 
                />
              </section>
              )}

            </div>

            {/* Footer Sticky Bar */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-1 flex-col sm:flex-row items-center justify-between mt-3 md:mt-0 gap-2">
              <div className="text-xs text-slate-500 font-medium hidden md:block">
                {lastSaved && `Draft auto-saved at ${lastSaved.toLocaleTimeString()}`}
              </div>
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <button onClick={discardDraft} className="h-11 px-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors text-sm font-bold shadow-sm">
                  <Trash2 className="size-4 hidden sm:block" /> Discard
                </button>
                {currentStep > 1 && (
                  <button onClick={() => {
                    saveDraftNow();
                    setCurrentStep(prev => prev - 1);
                  }} className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-sm font-bold shadow-sm">
                    Back
                  </button>
                )}
                {currentStep < 7 && (
                  <button onClick={() => {
                    saveDraftNow();
                    setCurrentStep(prev => prev + 1);
                  }} className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-bold shadow-sm">
                    Skip / Next <ChevronRight className="size-4" />
                  </button>
                )}
                <button 
                  onClick={() => submitMutation.mutate()} 
                  disabled={submitMutation.isPending || !formData.client_name || !formData.business_name} 
                  className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-sm font-bold shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
                  {submitMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

      {/* View Client Modal */}
      {viewClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all border border-slate-200">
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                {viewClient.business_logo_url ? (
                  <img src={viewClient.business_logo_url} alt="Logo" className="size-12 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1" />
                ) : (
                  <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Building2 className="size-6 text-slate-900" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                    {viewClient.business_name}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">{viewClient.client_name}</p>
                </div>
              </div>
              <button onClick={() => setViewClient(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                
                {/* Basic Info */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle2 className="size-4" /> Basic Information
                    </h3>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Industry</span>
                        <span className="text-sm font-bold text-slate-700">{viewClient.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Onboarded On</span>
                        <span className="text-sm font-bold text-slate-700">{viewClient.date_of_onboarding ? new Date(viewClient.date_of_onboarding).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">PAN</span>
                        <span className="text-sm font-bold text-slate-700 uppercase">{viewClient.pan || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">GST</span>
                        <span className="text-sm font-bold text-slate-700 uppercase">{viewClient.gst || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <UserPlus className="size-4" /> Contact Details
                    </h3>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Emails</span>
                        <div className="flex flex-wrap gap-1.5">
                          {viewClient.emails?.length ? viewClient.emails.map((e: string, i: number) => <span key={i} className="text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded-md">{e}</span>) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Phones</span>
                        <div className="flex flex-wrap gap-1.5">
                          {viewClient.phone_numbers?.length ? viewClient.phone_numbers.map((e: string, i: number) => <span key={i} className="text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded-md">{e}</span>) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Business POC</span>
                        <div className="space-y-2">
                          {viewClient.poc_business?.length ? viewClient.poc_business.map((p: any, i: number) => (
                            <div key={i} className="text-sm text-slate-700 flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="font-bold">{p.name || '-'}</span> 
                              {p.phone && <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">{p.phone}</span>}
                            </div>
                          )) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Our POC (Team)</span>
                        <div className="flex flex-wrap gap-1.5">
                          {viewClient.poc_our_side?.length ? viewClient.poc_our_side.map((p: string, i: number) => <span key={i} className="text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-md">{p}</span>) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Business Profile</h3>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Location</span>
                        <p className="text-sm font-medium text-slate-800">{viewClient.target_location || '-'}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Products / Services Offered</span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{viewClient.products_services_offered || '-'}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Unique Selling Proposition (USP)</span>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{viewClient.usp || '-'}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Business Goals</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {viewClient.business_goals?.length ? viewClient.business_goals.map((g: string, i: number) => <span key={i} className="text-xs font-bold bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded-md">{g}</span>) : <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewClient.custom_notes && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Custom Notes</h3>
                      <div className="bg-slate-100/50 rounded-xl p-3 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic">{viewClient.custom_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-3 border-t border-slate-200 bg-white flex justify-end gap-2">
              <button onClick={() => setViewClient(null)} className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
                Close
              </button>
              <button onClick={() => {
                const id = viewClient.id;
                setViewClient(null);
                router.push(`/dashboard/${verticalName}/client/${id}`);
              }} className="px-3 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm shadow-emerald-600/20 flex items-center gap-2">
                Open Full Dashboard <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
