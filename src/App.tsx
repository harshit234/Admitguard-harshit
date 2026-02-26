/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Phone, Calendar, GraduationCap, CalendarDays, Percent, 
  ClipboardCheck, ShieldCheck, Send, CheckCircle2, XCircle, Clock, 
  AlertCircle, AlertTriangle, CheckCircle, History, Trash2, Eye, 
  FileText, Info, Settings, Check, Search, Filter, Download, 
  ChevronLeft, ChevronRight, ArrowRight, LayoutDashboard, UserCheck, 
  UserMinus, UserX, ShieldAlert, MoreVertical, ExternalLink, RefreshCw 
} from 'lucide-react';

type RuleConfig = any;
type RulesConfig = Record<string, any>;

const INITIAL_RULES_CONFIG: RulesConfig = {
  fullName: {
    type: "strict",
    required: true,
    minLength: 2,
    pattern: /^[a-zA-Z\s]+$/,
    errorMessage: "Name must be at least 2 characters and contain no numbers.",
    requiredMessage: "Full Name is required."
  },
  email: {
    type: "strict",
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: "Please enter a valid email address.",
    requiredMessage: "Email is required."
  },
  phone: {
    type: "strict",
    required: true,
    pattern: /^[6-9]\d{9}$/,
    errorMessage: "Phone must be 10 digits starting with 6, 7, 8, or 9.",
    requiredMessage: "Phone number is required."
  },
  dob: {
    type: "soft",
    ageRange: [18, 35],
    errorMessage: "Age must be between 18 and 35",
    exceptionAllowed: true
  },
  qualification: {
    type: "strict",
    required: true,
    errorMessage: "Please select a qualification."
  },
  gradYear: {
    type: "soft",
    range: [2015, 2025],
    errorMessage: "Graduation year is outside the standard range (2015-2025).",
    exceptionAllowed: true
  },
  score: {
    type: "soft",
    thresholds: {
      percentage: 60,
      cgpa: 6.0
    },
    errorMessage: "Score is below the recommended threshold.",
    exceptionAllowed: true
  },
  screeningScore: {
    type: "soft",
    min: 40,
    errorMessage: "Screening score is below the passing mark of 40.",
    exceptionAllowed: true
  },
  status: {
    type: "strict",
    required: true,
    forbidden: "Rejected",
    errorMessage: "Interview status is required.",
    forbiddenMessage: "Rejected candidates cannot be enrolled."
  },
  aadhaar: {
    type: "strict",
    required: true,
    pattern: /^\d{12}$/,
    errorMessage: "Aadhaar must be exactly 12 digits.",
    requiredMessage: "Aadhaar number is required."
  },
  offerSent: {
    type: "strict",
    dependency: {
      field: "status",
      validValues: ["Cleared", "Waitlisted"]
    },
    errorMessage: "Offer letter can only be sent to Cleared or Waitlisted candidates."
  }
};

export default function App() {
  const [rules, setRules] = useState<any>(() => {
    const saved = localStorage.getItem('admitguard_rules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive regex patterns
        Object.keys(parsed).forEach(key => {
          if (parsed[key].pattern && typeof parsed[key].pattern === 'string') {
            const match = parsed[key].pattern.match(/^\/(.*)\/([a-z]*)$/);
            if (match) {
              parsed[key].pattern = new RegExp(match[1], match[2]);
            }
          }
        });
        return parsed;
      } catch (e) {
        return INITIAL_RULES_CONFIG;
      }
    }
    return INITIAL_RULES_CONFIG;
  });
  const [pendingRules, setPendingRules] = useState<any>(rules);
  const [impact, setImpact] = useState<{ flagged: number; errors: number } | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    qualification: '',
    gradYear: '',
    score: '',
    screeningScore: '',
    status: '',
    aadhaar: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [exceptions, setExceptions] = useState<Record<string, boolean>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [rationaleErrors, setRationaleErrors] = useState<Record<string, string>>({});
  
  const [isCgpa, setIsCgpa] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [activeExceptionCount, setActiveExceptionCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'form' | 'logs' | 'rules'>('form');
  const [logs, setLogs] = useState<any[]>([]);
  const [viewingLog, setViewingLog] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [flagFilter, setFlagFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const savedLogs = localStorage.getItem("admitguard_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleExceptionToggle = (field: string) => {
    setExceptions(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleRationaleChange = (field: string, value: string) => {
    setRationales(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const submissionData = {
      ...formData,
      offerSent,
      exceptions: Object.keys(exceptions).filter(k => exceptions[k]).reduce((obj, key) => {
        obj[key] = rationales[key];
        return obj;
      }, {} as Record<string, string>),
      flagged: isFlagged,
      exceptionCount: activeExceptionCount,
      isCgpa,
      timestamp: new Date().toLocaleString(),
      id: Date.now()
    };

    const existingLogs = JSON.parse(localStorage.getItem("admitguard_logs") || "[]");
    const updatedLogs = [submissionData, ...existingLogs];
    localStorage.setItem("admitguard_logs", JSON.stringify(updatedLogs));
    setLogs(updatedLogs);

    setIsSubmitting(false);
    alert(`Form submitted successfully! ${isFlagged ? 'Entry has been flagged for manager review.' : ''}`);
    
    // Reset form
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      dob: '',
      qualification: '',
      gradYear: '',
      score: '',
      screeningScore: '',
      status: '',
      aadhaar: ''
    });
    setExceptions({});
    setRationales({});
    setOfferSent(false);
  };

  const clearLogs = () => {
    if (window.confirm("Are you sure you want to clear all audit logs? This action cannot be undone.")) {
      localStorage.removeItem("admitguard_logs");
      setLogs([]);
    }
  };

  const validateRationale = (text: string) => {
    const keywords = ["approved by", "special case", "documentation pending", "waiver granted"];
    const hasKeyword = keywords.some(keyword => text.toLowerCase().includes(keyword));
    const isLongEnough = text.length >= 30;

    if (!isLongEnough) return "Rationale must be at least 30 characters.";
    if (!hasKeyword) return "Rationale must include a valid keyword (e.g., 'approved by', 'special case').";
    return "";
  };

  const getRecommendation = (data: any) => {
    if (data.flagged) return { label: 'Reject', color: 'text-red-600', bg: 'bg-red-50', icon: <UserX size={16} /> };
    if (data.status === 'Rejected') return { label: 'Reject', color: 'text-red-600', bg: 'bg-red-50', icon: <UserX size={16} /> };
    if (data.exceptionCount > 0) return { label: 'Review / Waitlist', color: 'text-amber-600', bg: 'bg-amber-50', icon: <UserMinus size={16} /> };
    if (data.screeningScore >= 70 && data.score >= 70) return { label: 'Fast-track Approve', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <UserCheck size={16} /> };
    return { label: 'Standard Approve', color: 'text-brand-600', bg: 'bg-brand-50', icon: <CheckCircle size={16} /> };
  };

  const getKPIs = () => {
    return {
      total: logs.length,
      cleared: logs.filter(l => l.status === 'Cleared').length,
      waitlisted: logs.filter(l => l.status === 'Waitlisted').length,
      rejected: logs.filter(l => l.status === 'Rejected').length,
      flagged: logs.filter(l => l.flagged).length
    };
  };

  const exportToCSV = () => {
    const filteredLogs = getFilteredLogs();
    if (filteredLogs.length === 0) return;

    const headers = ["Name", "Email", "Phone", "Qualification", "Grad Year", "Score", "Screening Score", "Status", "Flagged", "Exceptions", "Timestamp"];
    const rows = filteredLogs.map(log => [
      log.fullName,
      log.email,
      log.phone,
      log.qualification,
      log.gradYear,
      log.score,
      log.screeningScore,
      log.status,
      log.flagged ? 'Yes' : 'No',
      log.exceptionCount,
      log.timestamp
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `admitguard_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchesSearch = 
        log.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchesFlag = flagFilter === 'All' || (flagFilter === 'Flagged' ? log.flagged : !log.flagged);

      return matchesSearch && matchesStatus && matchesFlag;
    });
  };

  const calculateImpact = () => {
    if (logs.length === 0) {
      addToast("No logs available to calculate impact.", "error");
      return;
    }

    let flaggedCount = 0;
    let errorCount = 0;

    logs.forEach(log => {
      let exceptions = 0;
      let hasError = false;

      Object.entries(pendingRules as Record<string, any>).forEach(([field, config]) => {
        const value = log[field as keyof typeof log];
        
        // Simplified validation for impact preview
        if (config.type === 'strict') {
          if (config.required && !value) hasError = true;
          if (config.pattern && value && !new RegExp(config.pattern).test(String(value))) hasError = true;
          if (config.forbidden && value === config.forbidden) hasError = true;
        } else if (config.type === 'soft') {
          let isWarning = false;
          if (config.min !== undefined && Number(value) < config.min) isWarning = true;
          if (config.max !== undefined && Number(value) > config.max) isWarning = true;
          if (config.range && (Number(value) < config.range[0] || Number(value) > config.range[1])) isWarning = true;
          if (config.ageRange) {
            const age = new Date().getFullYear() - new Date(String(value)).getFullYear();
            if (age < config.ageRange[0] || age > config.ageRange[1]) isWarning = true;
          }
          if (config.thresholds) {
            const threshold = log.isCgpa ? config.thresholds.cgpa : config.thresholds.percentage;
            if (Number(value) < threshold) isWarning = true;
          }

          if (isWarning) exceptions++;
        }
      });

      if (hasError) errorCount++;
      if (exceptions > 2) flaggedCount++;
    });

    setImpact({ flagged: flaggedCount, errors: errorCount });
    addToast("Impact preview calculated successfully.");
  };

  const saveRules = () => {
    setRules(pendingRules);
    // Save to localStorage
    const toSave = JSON.parse(JSON.stringify(pendingRules, (key, value) => 
      value instanceof RegExp ? value.toString() : value
    ));
    localStorage.setItem('admitguard_rules', JSON.stringify(toSave));
    setImpact(null);
    addToast("Rules configuration saved successfully.");
  };

  const resetRules = () => {
    setPendingRules(rules);
    setImpact(null);
    addToast("Changes discarded.");
  };

  const factoryReset = () => {
    setPendingRules(INITIAL_RULES_CONFIG);
    setRules(INITIAL_RULES_CONFIG);
    localStorage.removeItem('admitguard_rules');
    setImpact(null);
    addToast("Reset to factory defaults.");
  };

  const updateRule = (field: string, key: string, value: any) => {
    setPendingRules(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value
      }
    }));
    setImpact(null); // Reset impact when rules change
  };

  const handleOpenDrawer = (log: any) => {
    setViewingLog(log);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const newWarnings: Record<string, string> = {};
    const newRationaleErrors: Record<string, string> = {};

    // Apply rules from rules state
    Object.entries(rules as Record<string, any>).forEach(([field, config]) => {
      const value = formData[field as keyof typeof formData];

      if (config.type === 'strict') {
        // 1. Required check
        if (config.required && !value && field !== 'offerSent') {
          newErrors[field] = config.requiredMessage || config.errorMessage;
        } 
        
        // 2. Min length check
        if (!newErrors[field] && config.minLength && value && String(value).length < config.minLength) {
          newErrors[field] = config.errorMessage;
        }

        // 3. Pattern check
        if (!newErrors[field] && config.pattern && value) {
          const pattern = config.pattern instanceof RegExp ? config.pattern : new RegExp(config.pattern.replace(/^\/|\/$/g, ''));
          if (!pattern.test(String(value))) {
            newErrors[field] = config.errorMessage;
          }
        }

        // 4. Forbidden check
        if (!newErrors[field] && config.forbidden && value === config.forbidden) {
          newErrors[field] = config.forbiddenMessage;
        }

        // 5. Dependency check
        if (!newErrors[field] && config.dependency) {
          const depValue = formData[config.dependency.field as keyof typeof formData];
          if (field === 'offerSent') {
            if (offerSent && !config.dependency.validValues.includes(depValue)) {
              newErrors[field] = config.errorMessage;
            }
          } else if (value && !config.dependency.validValues.includes(depValue)) {
            newErrors[field] = config.errorMessage;
          }
        }
      } else if (config.type === 'soft') {
        if (field === 'dob' && value) {
          const birthDate = new Date(value);
          const today = new Date("2026-02-26");
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < config.ageRange[0] || age > config.ageRange[1]) {
            newWarnings[field] = `Candidate age is ${age}. ${config.errorMessage}`;
          }
        } else if (field === 'gradYear' && value) {
          const year = parseInt(value);
          if (year < config.range[0] || year > config.range[1]) {
            newWarnings[field] = config.errorMessage;
          }
        } else if (field === 'score' && value) {
          const score = parseFloat(value);
          if (isCgpa) {
            if (score < config.thresholds.cgpa) newWarnings[field] = `CGPA is below the recommended ${config.thresholds.cgpa} threshold.`;
          } else {
            if (score < config.thresholds.percentage) newWarnings[field] = `Percentage is below the recommended ${config.thresholds.percentage}% threshold.`;
          }
        } else if (field === 'screeningScore' && value) {
          const score = parseInt(value);
          if (score < config.min) {
            newWarnings[field] = config.errorMessage;
          }
        }
      }
    });

    // --- RATIONALE VALIDATION ---
    let count = 0;
    Object.keys(newWarnings).forEach(field => {
      if (exceptions[field]) {
        const rationaleError = validateRationale(rationales[field] || "");
        if (rationaleError) {
          newRationaleErrors[field] = rationaleError;
        } else if (rationales[field]) {
          count++;
        }
      }
    });

    setErrors(newErrors);
    setWarnings(newWarnings);
    setRationaleErrors(newRationaleErrors);
    setActiveExceptionCount(count);
    setIsFlagged(count > 2);
    
    // --- FINAL VALIDITY CHECK ---
    const hasStrictErrors = Object.keys(newErrors).length > 0;
    
    // Dynamically check if all required fields are filled
    const allRequiredFilled = Object.entries(rules as Record<string, any>).every(([field, config]) => {
      if (config.type === 'strict' && config.required && field !== 'offerSent') {
        return !!formData[field as keyof typeof formData];
      }
      return true;
    });
    
    // Check if all active warnings have valid exceptions
    const unresolvedWarnings = Object.keys(newWarnings).some(field => {
      return !exceptions[field] || !!newRationaleErrors[field];
    });

    setIsValid(!hasStrictErrors && allRequiredFilled && !unresolvedWarnings);
  }, [formData, offerSent, exceptions, rationales, isCgpa, rules]);

  const getFieldStatus = (field: string) => {
    if (errors[field]) return 'error';
    if (warnings[field]) {
      if (exceptions[field] && !rationaleErrors[field]) return 'valid';
      return 'warning';
    }
    // For fields that are filled and have no errors/warnings
    if (formData[field as keyof typeof formData]) return 'valid';
    return 'idle';
  };

  const getBorderClass = (status: string) => {
    switch (status) {
      case 'error': return 'border-red-300 focus:ring-red-500/20 focus:border-red-500';
      case 'warning': return 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500';
      case 'valid': return 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-500';
      default: return 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-500';
    }
  };

  const renderExceptionUI = (field: string) => {
    if (!warnings[field]) return null;

    return (
      <div className="mt-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-4 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={!!exceptions[field]}
              onChange={() => handleExceptionToggle(field)}
              className="peer w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer appearance-none bg-white border-2 checked:bg-amber-500 checked:border-amber-500"
            />
            <Check className="absolute w-3.5 h-3.5 text-white left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={4} />
          </div>
          <span className="text-xs font-bold text-amber-800 group-hover:text-amber-900 transition-colors">Request Exception Waiver</span>
        </label>

        {exceptions[field] && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <textarea
              placeholder="Provide detailed rationale (min 30 chars)..."
              value={rationales[field] || ""}
              onChange={(e) => handleRationaleChange(field, e.target.value)}
              className={`w-full p-3 text-xs bg-white border rounded-xl focus:outline-none focus:ring-4 transition-all min-h-[100px] shadow-inner placeholder:text-slate-300 font-medium ${
                rationaleErrors[field] 
                  ? 'border-red-300 focus:ring-red-500/10' 
                  : 'border-amber-200 focus:ring-amber-500/10'
              }`}
            />
            {rationaleErrors[field] ? (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 px-1">
                <AlertCircle size={10} /> {rationaleErrors[field]}
              </p>
            ) : (
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 px-1">
                <CheckCircle size={10} /> Rationale verified
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-brand-100 selection:text-brand-900">
      <div className="max-w-4xl mx-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-200 mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Admit<span className="text-brand-600">Guard</span>
          </h1>
          <p className="mt-2 text-slate-500 font-medium max-w-md">
            Intelligent candidate screening and admission management system for modern educational institutions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-center gap-1 relative">
            {[
              { id: 'form', label: 'Admission Form', icon: <ClipboardCheck size={18} /> },
              { id: 'logs', label: 'Audit Log', icon: <History size={18} /> },
              { id: 'rules', label: 'Rules Config', icon: <Settings size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5 outline-none ${
                  activeTab === tab.id 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 active:scale-95'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-brand-600 rounded-xl shadow-lg shadow-brand-200"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className={`${activeTab === 'form' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              {activeTab === 'rules' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Settings className="text-brand-600" />
                      Validation Rules Configuration
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Customize the admission criteria and screening logic.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={calculateImpact}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-xl hover:bg-brand-100 transition-all active:scale-95"
                    >
                      <RefreshCw size={16} />
                      Preview Impact
                    </button>
                    <button
                      onClick={factoryReset}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all active:scale-95"
                    >
                      Factory Reset
                    </button>
                    <button
                      onClick={resetRules}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                      Reset
                    </button>
                    <button
                      onClick={saveRules}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {impact && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <LayoutDashboard size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900">Impact Preview Results</p>
                        <p className="text-xs text-indigo-600 font-medium">Based on {logs.length} existing applications</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">New Flagged</p>
                        <p className="text-xl font-black text-indigo-700">{impact.flagged}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">New Errors</p>
                        <p className="text-xl font-black text-indigo-700">{impact.errors}</p>
                      </div>
                      <div className="h-8 w-px bg-indigo-200 hidden md:block" />
                      <p className="text-xs text-indigo-500 font-medium max-w-[200px] leading-tight">
                        {impact.flagged > 0 ? `${Math.round((impact.flagged / logs.length) * 100)}% of candidates would be flagged for review.` : 'No candidates would be flagged with these rules.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(pendingRules as Record<string, any>).map(([field, config]) => (
                    <div key={field} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.type === 'strict' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            {config.type === 'strict' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 capitalize">{field.replace(/([A-Z])/g, ' $1')}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.type} Rule</p>
                          </div>
                        </div>
                        <select
                          value={config.type}
                          onChange={(e) => updateRule(field, 'type', e.target.value)}
                          className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/10"
                        >
                          <option value="strict">Strict</option>
                          <option value="soft">Soft</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        {config.type === 'soft' && (
                          <div className="grid grid-cols-2 gap-3">
                            {config.min !== undefined && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Min Value</label>
                                <input
                                  type="number"
                                  value={config.min}
                                  onChange={(e) => updateRule(field, 'min', Number(e.target.value))}
                                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                />
                              </div>
                            )}
                            {config.max !== undefined && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Max Value</label>
                                <input
                                  type="number"
                                  value={config.max}
                                  onChange={(e) => updateRule(field, 'max', Number(e.target.value))}
                                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                />
                              </div>
                            )}
                            {config.range && (
                              <>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Start Year</label>
                                  <input
                                    type="number"
                                    value={config.range[0]}
                                    onChange={(e) => updateRule(field, 'range', [Number(e.target.value), config.range[1]])}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">End Year</label>
                                  <input
                                    type="number"
                                    value={config.range[1]}
                                    onChange={(e) => updateRule(field, 'range', [config.range[0], Number(e.target.value)])}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                              </>
                            )}
                            {config.ageRange && (
                              <>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Min Age</label>
                                  <input
                                    type="number"
                                    value={config.ageRange[0]}
                                    onChange={(e) => updateRule(field, 'ageRange', [Number(e.target.value), config.ageRange[1]])}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Max Age</label>
                                  <input
                                    type="number"
                                    value={config.ageRange[1]}
                                    onChange={(e) => updateRule(field, 'ageRange', [config.ageRange[0], Number(e.target.value)])}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                              </>
                            )}
                            {config.thresholds && (
                              <>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Min %</label>
                                  <input
                                    type="number"
                                    value={config.thresholds.percentage}
                                    onChange={(e) => updateRule(field, 'thresholds', { ...config.thresholds, percentage: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Min CGPA</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={config.thresholds.cgpa}
                                    onChange={(e) => updateRule(field, 'thresholds', { ...config.thresholds, cgpa: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {config.type === 'strict' && (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={config.required}
                                onChange={(e) => updateRule(field, 'required', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Required Field</span>
                            </label>
                          </div>
                        )}

                        {config.pattern && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Regex Pattern</label>
                            <input
                              type="text"
                              value={config.pattern.toString()}
                              onChange={(e) => {
                                try {
                                  // Basic attempt to parse string back to regex
                                  const match = e.target.value.match(/^\/(.*)\/([a-z]*)$/);
                                  if (match) {
                                    updateRule(field, 'pattern', new RegExp(match[1], match[2]));
                                  } else {
                                    updateRule(field, 'pattern', new RegExp(e.target.value));
                                  }
                                } catch (err) {
                                  // Ignore invalid regex while typing
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Error Message</label>
                          <textarea
                            value={config.errorMessage}
                            onChange={(e) => updateRule(field, 'errorMessage', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/10 min-h-[60px] resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'logs' ? (
              <div className="space-y-6">
                {/* Dashboard Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Apps', value: getKPIs().total, icon: <FileText size={18} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                    { label: 'Cleared', value: getKPIs().cleared, icon: <UserCheck size={18} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                    { label: 'Waitlisted', value: getKPIs().waitlisted, icon: <UserMinus size={18} />, color: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { label: 'Rejected', value: getKPIs().rejected, icon: <UserX size={18} />, color: 'bg-red-50 text-red-600 border-red-100' },
                    { label: 'Flagged', value: getKPIs().flagged, icon: <ShieldAlert size={18} />, color: 'bg-rose-50 text-rose-600 border-rose-100' },
                  ].map((kpi, i) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-2xl border ${kpi.color} flex flex-col gap-1 shadow-sm`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{kpi.label}</span>
                        {kpi.icon}
                      </div>
                      <span className="text-2xl font-black">{kpi.value}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search name, email, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                      >
                        <option value="All">All Status</option>
                        <option value="Cleared">Cleared</option>
                        <option value="Waitlisted">Waitlisted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <select
                        value={flagFilter}
                        onChange={(e) => setFlagFilter(e.target.value)}
                        className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                      >
                        <option value="All">All Flags</option>
                        <option value="Flagged">Flagged</option>
                        <option value="Normal">Normal</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={exportToCSV}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Download size={16} />
                      Export CSV
                    </button>
                    <button
                      onClick={clearLogs}
                      disabled={logs.length === 0}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      <Trash2 size={16} />
                      Clear
                    </button>
                  </div>
                </div>

                {getFilteredLogs().length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-xl shadow-slate-200/60">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300 rotate-12">
                      <History size={40} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg">No logs available</p>
                      <p className="text-slate-500 text-sm">Submitted applications will appear here for audit review.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/60">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Flagged</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Waivers</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {getFilteredLogs()
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{log.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{log.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-slate-700">{log.score}{log.isCgpa ? '' : '%'}</div>
                                <div className="text-[10px] text-slate-400">Screening: {log.screeningScore}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  log.status === 'Cleared' ? 'bg-emerald-50 text-emerald-600' :
                                  log.status === 'Waitlisted' ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-red-600'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {log.flagged ? (
                                  <div className="flex justify-center">
                                    <ShieldAlert size={16} className="text-rose-500" />
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <CheckCircle size={16} className="text-slate-200" />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold ${log.exceptionCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                  {log.exceptionCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                {log.timestamp.split(',')[0]}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleOpenDrawer(log)}
                                  className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                                >
                                  <ArrowRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-medium">
                        Showing <span className="text-slate-900 font-bold">{Math.min(getFilteredLogs().length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-slate-900 font-bold">{Math.min(getFilteredLogs().length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900 font-bold">{getFilteredLogs().length}</span> entries
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="p-2 text-slate-400 hover:text-brand-600 disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(getFilteredLogs().length / itemsPerPage) }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                currentPage === i + 1 ? 'bg-brand-600 text-white shadow-md shadow-brand-200' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          disabled={currentPage === Math.ceil(getFilteredLogs().length / itemsPerPage)}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="p-2 text-slate-400 hover:text-brand-600 disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rejected Banner */}
                {formData.status === "Rejected" && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-medium">Rejected candidates cannot be enrolled. Please review the status.</p>
                  </div>
                )}

                {/* Header */}
                <div className="mb-8 text-center">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Candidate Admission Form</h1>
                  <p className="mt-2 text-slate-600">Internal tool for candidate screening and admission management.</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
                  <div className="p-8 sm:p-10">
                    <form className="space-y-8" onSubmit={handleSubmit}>
                  
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <User size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label htmlFor="fullName" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Full Name
                          </span>
                          {getFieldStatus('fullName') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            id="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="John Doe"
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('fullName'))}`}
                          />
                        </div>
                        <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.fullName}</div>
                      </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          Email Address
                        </span>
                        {getFieldStatus('email') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('email'))}`}
                        />
                      </div>
                      <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.email}</div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          Phone Number
                        </span>
                        {getFieldStatus('phone') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                          <Phone size={18} />
                        </div>
                        <input
                          type="text"
                          id="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="10-digit number"
                          maxLength={10}
                          className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('phone'))}`}
                        />
                      </div>
                      <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.phone}</div>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label htmlFor="dob" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          Date of Birth
                        </span>
                        {getFieldStatus('dob') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                          <Calendar size={18} />
                        </div>
                        <input
                          type="date"
                          id="dob"
                          value={formData.dob}
                          onChange={handleInputChange}
                          className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 input-focus ${getBorderClass(getFieldStatus('dob'))}`}
                        />
                      </div>
                      <div className="min-h-[1rem]">
                        {warnings.dob && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.dob}</p>}
                      </div>
                      {renderExceptionUI('dob')}
                    </div>
                  </div>
                </div>

                {/* Academic Information Section */}
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <GraduationCap size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Academic Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Highest Qualification */}
                      <div className="space-y-1.5">
                        <label htmlFor="qualification" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Highest Qualification
                          </span>
                          {getFieldStatus('qualification') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <GraduationCap size={18} />
                          </div>
                          <select
                            id="qualification"
                            value={formData.qualification}
                            onChange={handleInputChange}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 appearance-none input-focus ${getBorderClass(getFieldStatus('qualification'))}`}
                          >
                            <option value="">Select Qualification</option>
                            <option value="B.Tech">B.Tech</option>
                            <option value="B.E.">B.E.</option>
                            <option value="B.Sc">B.Sc</option>
                            <option value="BCA">BCA</option>
                            <option value="M.Tech">M.Tech</option>
                            <option value="M.Sc">M.Sc</option>
                            <option value="MCA">MCA</option>
                            <option value="MBA">MBA</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                        <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.qualification}</div>
                      </div>

                      {/* Graduation Year */}
                      <div className="space-y-1.5">
                        <label htmlFor="gradYear" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Graduation Year
                          </span>
                          {getFieldStatus('gradYear') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <CalendarDays size={18} />
                          </div>
                          <input
                            type="number"
                            id="gradYear"
                            value={formData.gradYear}
                            onChange={handleInputChange}
                            placeholder="2015-2025"
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('gradYear'))}`}
                          />
                        </div>
                        <div className="min-h-[1rem]">
                          {warnings.gradYear && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.gradYear}</p>}
                        </div>
                        {renderExceptionUI('gradYear')}
                      </div>

                      {/* Percentage / CGPA Toggle */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label htmlFor="score" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            {isCgpa ? 'CGPA' : 'Percentage'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCgpa(!isCgpa)}
                            className="text-[10px] uppercase tracking-wider font-bold text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            Switch to {isCgpa ? 'Percentage' : 'CGPA'}
                          </button>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <Percent size={18} />
                          </div>
                          <input
                            type="number"
                            id="score"
                            value={formData.score}
                            onChange={handleInputChange}
                            step="0.01"
                            placeholder={isCgpa ? "e.g. 9.5" : "e.g. 85"}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('score'))}`}
                          />
                        </div>
                        <div className="min-h-[1rem]">
                          {warnings.score && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.score}</p>}
                        </div>
                        {renderExceptionUI('score')}
                      </div>

                      {/* Screening Test Score */}
                      <div className="space-y-1.5">
                        <label htmlFor="screeningScore" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Screening Test Score (0-100)
                          </span>
                          {getFieldStatus('screeningScore') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <ClipboardCheck size={18} />
                          </div>
                          <input
                            type="number"
                            id="screeningScore"
                            value={formData.screeningScore}
                            onChange={handleInputChange}
                            min="0"
                            max="100"
                            placeholder="Score"
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('screeningScore'))}`}
                          />
                        </div>
                        <div className="min-h-[1rem]">
                          {warnings.screeningScore && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.screeningScore}</p>}
                        </div>
                        {renderExceptionUI('screeningScore')}
                      </div>
                    </div>
                  </div>

                  {/* Status & Identity Section */}
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <ShieldCheck size={18} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Identity & Status</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Interview Status */}
                      <div className="space-y-1.5">
                        <label htmlFor="status" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Interview Status
                          </span>
                          {getFieldStatus('status') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <Clock size={18} />
                          </div>
                          <select
                            id="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 appearance-none input-focus ${getBorderClass(getFieldStatus('status'))}`}
                          >
                            <option value="">Select Status</option>
                            <option value="Cleared">Cleared</option>
                            <option value="Waitlisted">Waitlisted</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                        <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.status}</div>
                      </div>

                      {/* Aadhaar Number */}
                      <div className="space-y-1.5">
                        <label htmlFor="aadhaar" className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            Aadhaar Number
                          </span>
                          {getFieldStatus('aadhaar') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                            <ShieldCheck size={18} />
                          </div>
                          <input
                            type="text"
                            id="aadhaar"
                            value={formData.aadhaar}
                            onChange={handleInputChange}
                            placeholder="12-digit number"
                            maxLength={12}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 input-focus ${getBorderClass(getFieldStatus('aadhaar'))}`}
                          />
                        </div>
                        <div className="h-4 text-[11px] text-red-500 px-1 font-medium">{errors.aadhaar}</div>
                      </div>
                    </div>

                    {/* Offer Letter Sent Toggle */}
                    <div className={`mt-6 flex flex-col gap-2 p-5 bg-slate-50 rounded-2xl border transition-all duration-300 ${errors.offerSent ? 'border-red-300 bg-red-50/30 shadow-inner' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${offerSent ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                            {offerSent ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Offer Letter Sent</p>
                            <p className="text-xs text-slate-500 font-medium">Has the official offer letter been dispatched?</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOfferSent(!offerSent)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 ${offerSent ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${offerSent ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                      {errors.offerSent && (
                        <div className="text-[11px] text-red-500 font-bold flex items-center gap-1.5 mt-2 px-1">
                          <AlertCircle size={14} />
                          {errors.offerSent}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button Section */}
                  <div className="pt-8 space-y-5">
                    {/* Flagging Warning */}
                    {isFlagged && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <AlertTriangle size={20} />
                        </div>
                        <p className="text-xs font-bold leading-relaxed">Manager Review Required: This candidate has more than 2 exceptions. Entry will be flagged for secondary audit.</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2.5 text-slate-500">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${activeExceptionCount > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-300'}`} />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Exceptions: {activeExceptionCount}</span>
                      </div>
                      {isFlagged && <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 uppercase tracking-widest">Flagged</span>}
                    </div>

                    <button
                      disabled={!isValid || isSubmitting}
                      type="submit"
                      className={`w-full flex items-center justify-center gap-3 px-6 py-4 font-bold rounded-2xl transition-all shadow-xl ${
                        isValid && !isSubmitting
                          ? 'bg-brand-600 text-white shadow-brand-200 hover:bg-brand-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing Application...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Submit Admission Details
                        </>
                      )}
                    </button>
                    {!isValid && (
                      <p className="mt-3 text-center text-xs text-slate-400 italic">
                        Please fix all errors and provide valid rationales for warnings to enable the submit button.
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Insights Panel */}
      {activeTab === 'form' && (
        <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl shadow-slate-200/60 sticky top-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <LayoutDashboard size={20} className="text-brand-600" />
                  Validation Insights
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                        <AlertCircle size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Critical Errors</span>
                    </div>
                    <span className="text-sm font-black text-red-600">{Object.keys(errors).length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <AlertTriangle size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Soft Warnings</span>
                    </div>
                    <span className="text-sm font-black text-amber-600">{Object.keys(warnings).length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Active Waivers</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{activeExceptionCount}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Assessment</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      Object.keys(errors).length > 0 || isFlagged ? 'bg-red-50 text-red-600' :
                      activeExceptionCount > 0 ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {Object.keys(errors).length > 0 || isFlagged ? 'High Risk' : activeExceptionCount > 0 ? 'Medium Risk' : 'Low Risk'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${
                        Object.keys(errors).length > 0 || isFlagged ? 'bg-red-500' :
                        activeExceptionCount > 0 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (Object.keys(errors).length * 40) + (activeExceptionCount * 20))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-8 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                  <h4 className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-2">Decision Support</h4>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                      <Info size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Recommendation</p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {Object.keys(errors).length > 0 ? 'Reject application due to critical validation failures.' :
                         isFlagged ? 'Review required: Candidate flagged for secondary audit due to multiple exceptions.' :
                         activeExceptionCount > 0 ? 'Waitlist/Review: Candidate meets core criteria but has active waivers.' :
                         'Fast-track: Candidate meets all standard admission criteria.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

    {/* Footer Info */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          &copy; 2026 Education Company Admission Portal. All rights reserved.
        </div>
      </div>

      {/* Toast Notifications */}
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>

    {/* Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Submission Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Audit ID: {viewingLog.id.slice(0, 8)}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingLog(null)} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-all active:scale-90"
              >
                <XCircle size={28} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Full Name</label>
                  <p className="text-slate-900 font-bold text-lg">{viewingLog.fullName}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Email Address</label>
                  <p className="text-slate-900 font-bold">{viewingLog.email}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Phone Number</label>
                  <p className="text-slate-900 font-bold">{viewingLog.phone}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Date of Birth</label>
                  <p className="text-slate-900 font-bold">{viewingLog.dob}</p>
                </div>
              </div>

              {/* Academic Info */}
              <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em] flex items-center gap-2">
                  <GraduationCap size={16} className="text-brand-500" />
                  Academic Profile
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualification</label>
                    <p className="text-sm font-bold text-slate-700">{viewingLog.qualification}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Graduation Year</label>
                    <p className="text-sm font-bold text-slate-700">{viewingLog.gradYear}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{viewingLog.isCgpa ? 'CGPA Score' : 'Percentage'}</label>
                    <p className="text-sm font-bold text-slate-700">{viewingLog.score}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screening Score</label>
                    <p className="text-sm font-bold text-slate-700">{viewingLog.screeningScore}/100</p>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Interview Status</label>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${
                    viewingLog.status === 'Cleared' ? 'bg-emerald-50 text-emerald-600' : 
                    viewingLog.status === 'Waitlisted' ? 'bg-amber-50 text-amber-600' : 
                    'bg-red-50 text-red-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      viewingLog.status === 'Cleared' ? 'bg-emerald-500' : 
                      viewingLog.status === 'Waitlisted' ? 'bg-amber-500' : 
                      'bg-red-500'
                    }`} />
                    {viewingLog.status}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.1em] block mb-1">Offer Letter</label>
                  <p className={`text-sm font-bold ${viewingLog.offerSent ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {viewingLog.offerSent ? 'Dispatched' : 'Not Sent'}
                  </p>
                </div>
              </div>

              {/* Exceptions Section */}
              {viewingLog.exceptionCount > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-[0.1em] flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Active Exceptions ({viewingLog.exceptionCount})
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(viewingLog.exceptions).map(([field, rationale]) => (
                      <div key={field} className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-800 capitalize flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {field.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 bg-white px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">Waiver Granted</span>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-amber-200 rounded-full" />
                          <p className="text-xs text-amber-900 leading-relaxed italic pl-4">"{rationale as string}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagging Status */}
              {viewingLog.flagged && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                  <Info size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Flagged for Manager Review</p>
                    <p className="text-xs text-red-600">This candidate exceeded the maximum exception threshold (2+) and requires manual verification.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewingLog(null)}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
