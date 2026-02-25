/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, Calendar, GraduationCap, CalendarDays, Percent, ClipboardCheck, ShieldCheck, Send, CheckCircle2, XCircle, Clock, AlertCircle, AlertTriangle, CheckCircle, History, Trash2, Eye, FileText, Info, Settings } from 'lucide-react';

const rulesConfig: Record<string, any> = {
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
  const [isValid, setIsValid] = useState(false);
  const [activeExceptionCount, setActiveExceptionCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'form' | 'logs' | 'rules'>('form');
  const [logs, setLogs] = useState<any[]>([]);
  const [viewingLog, setViewingLog] = useState<any | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

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

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const newWarnings: Record<string, string> = {};
    const newRationaleErrors: Record<string, string> = {};

    // Apply rules from rulesConfig
    Object.entries(rulesConfig).forEach(([field, config]) => {
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
        if (!newErrors[field] && config.pattern && value && !config.pattern.test(String(value))) {
          newErrors[field] = config.errorMessage;
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
          const today = new Date("2026-02-25");
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
    const allRequiredFilled = Object.entries(rulesConfig).every(([field, config]) => {
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
  }, [formData, offerSent, exceptions, rationales, isCgpa]);

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
      default: return 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500';
    }
  };

  const renderExceptionUI = (field: string) => {
    if (!warnings[field]) return null;

    return (
      <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={!!exceptions[field]}
            onChange={() => handleExceptionToggle(field)}
            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs font-semibold text-amber-800 group-hover:text-amber-900 transition-colors">Request Exception</span>
        </label>

        {exceptions[field] && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <textarea
              placeholder="Provide rationale (min 30 chars, include keywords like 'approved by' or 'special case')..."
              value={rationales[field] || ""}
              onChange={(e) => handleRationaleChange(field, e.target.value)}
              className={`w-full p-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all min-h-[80px] ${rationaleErrors[field] ? 'border-red-300 focus:ring-red-500/20' : 'border-amber-200 focus:ring-amber-500/20'}`}
            />
            {rationaleErrors[field] ? (
              <p className="text-[10px] text-red-500 font-medium">{rationaleErrors[field]}</p>
            ) : (
              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle size={10} /> Rationale valid
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-center gap-1 relative">
            {[
              { id: 'form', label: 'Admission Form', icon: <ClipboardCheck size={18} /> },
              { id: 'logs', label: 'Audit Log', icon: <History size={18} /> },
              { id: 'rules', label: 'Rules Config', icon: <Settings size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5 outline-none ${
                  activeTab === tab.id 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200"
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
          >
            {activeTab === 'rules' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="text-indigo-600" />
                    Validation Rules Configuration
                  </h2>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-sm">
                    <p className="font-semibold">System Configuration</p>
                    <p className="text-xs opacity-80">All validation logic is driven by this central configuration object. Changes here propagate instantly across the form.</p>
                  </div>
                  <pre className="text-xs font-mono bg-slate-50 p-4 rounded-xl overflow-auto max-h-[600px] text-slate-700">
                    {JSON.stringify(rulesConfig, (key, value) => value instanceof RegExp ? value.toString() : value, 2)}
                  </pre>
                </div>
              </div>
            ) : activeTab === 'logs' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <History className="text-indigo-600" />
                    Submission Audit Log
                  </h2>
                  <button
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                    Clear Log
                  </button>
                </div>

                {logs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <History size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">No submission logs found.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Exceptions</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Flagged</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900">{log.fullName}</div>
                                <div className="text-xs text-slate-500">{log.email}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{log.timestamp}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${log.exceptionCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {log.exceptionCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {log.flagged ? (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-wider">Yes</span>
                                ) : (
                                  <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">No</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setViewingLog(log)}
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                                >
                                  <Eye size={14} />
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                  
                  {/* Personal Information Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="fullName" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          Full Name
                        </span>
                        {getFieldStatus('fullName') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('fullName'))}`}
                      />
                      <div className="h-4 text-[11px] text-red-500 px-1">{errors.fullName}</div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Mail size={16} className="text-slate-400" />
                          Email Address
                        </span>
                        {getFieldStatus('email') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('email'))}`}
                      />
                      <div className="h-4 text-[11px] text-red-500 px-1">{errors.email}</div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Phone size={16} className="text-slate-400" />
                          Phone Number
                        </span>
                        {getFieldStatus('phone') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <input
                        type="text"
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="10-digit number"
                        maxLength={10}
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('phone'))}`}
                      />
                      <div className="h-4 text-[11px] text-red-500 px-1">{errors.phone}</div>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label htmlFor="dob" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          Date of Birth
                        </span>
                        {getFieldStatus('dob') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                      </label>
                      <input
                        type="date"
                        id="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 ${getBorderClass(getFieldStatus('dob'))}`}
                      />
                      <div className="min-h-[1rem]">
                        {warnings.dob && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.dob}</p>}
                      </div>
                      {renderExceptionUI('dob')}
                    </div>
                  </div>

                  {/* Academic Information Section */}
                  <div className="pt-4 border-t border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Academic Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Highest Qualification */}
                      <div className="space-y-1.5">
                        <label htmlFor="qualification" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <GraduationCap size={16} className="text-slate-400" />
                            Highest Qualification
                          </span>
                          {getFieldStatus('qualification') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <select
                          id="qualification"
                          value={formData.qualification}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 appearance-none ${getBorderClass(getFieldStatus('qualification'))}`}
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
                        <div className="h-4 text-[11px] text-red-500 px-1">{errors.qualification}</div>
                      </div>

                      {/* Graduation Year */}
                      <div className="space-y-1.5">
                        <label htmlFor="gradYear" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-slate-400" />
                            Graduation Year
                          </span>
                          {getFieldStatus('gradYear') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <input
                          type="number"
                          id="gradYear"
                          value={formData.gradYear}
                          onChange={handleInputChange}
                          placeholder="2015-2025"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('gradYear'))}`}
                        />
                        <div className="min-h-[1rem]">
                          {warnings.gradYear && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.gradYear}</p>}
                        </div>
                        {renderExceptionUI('gradYear')}
                      </div>

                      {/* Percentage / CGPA Toggle */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label htmlFor="score" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Percent size={16} className="text-slate-400" />
                            {isCgpa ? 'CGPA' : 'Percentage'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCgpa(!isCgpa)}
                            className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            Switch to {isCgpa ? 'Percentage' : 'CGPA'}
                          </button>
                        </div>
                        <input
                          type="number"
                          id="score"
                          value={formData.score}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder={isCgpa ? "e.g. 9.5" : "e.g. 85"}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('score'))}`}
                        />
                        <div className="min-h-[1rem]">
                          {warnings.score && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.score}</p>}
                        </div>
                        {renderExceptionUI('score')}
                      </div>

                      {/* Screening Test Score */}
                      <div className="space-y-1.5">
                        <label htmlFor="screeningScore" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck size={16} className="text-slate-400" />
                            Screening Test Score (0-100)
                          </span>
                          {getFieldStatus('screeningScore') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <input
                          type="number"
                          id="screeningScore"
                          value={formData.screeningScore}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          placeholder="Score"
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('screeningScore'))}`}
                        />
                        <div className="min-h-[1rem]">
                          {warnings.screeningScore && <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 px-1"><AlertTriangle size={12} /> {warnings.screeningScore}</p>}
                        </div>
                        {renderExceptionUI('screeningScore')}
                      </div>
                    </div>
                  </div>

                  {/* Status & Identity Section */}
                  <div className="pt-4 border-t border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Identity & Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Interview Status */}
                      <div className="space-y-1.5">
                        <label htmlFor="status" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            Interview Status
                          </span>
                          {getFieldStatus('status') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 appearance-none ${getBorderClass(getFieldStatus('status'))}`}
                        >
                          <option value="">Select Status</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Waitlisted">Waitlisted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <div className="h-4 text-[11px] text-red-500 px-1">{errors.status}</div>
                      </div>

                      {/* Aadhaar Number */}
                      <div className="space-y-1.5">
                        <label htmlFor="aadhaar" className="text-sm font-medium text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-slate-400" />
                            Aadhaar Number
                          </span>
                          {getFieldStatus('aadhaar') === 'valid' && <CheckCircle size={14} className="text-emerald-500" />}
                        </label>
                        <input
                          type="text"
                          id="aadhaar"
                          value={formData.aadhaar}
                          onChange={handleInputChange}
                          placeholder="12-digit number"
                          maxLength={12}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 ${getBorderClass(getFieldStatus('aadhaar'))}`}
                        />
                        <div className="h-4 text-[11px] text-red-500 px-1">{errors.aadhaar}</div>
                      </div>
                    </div>

                    {/* Offer Letter Sent Toggle */}
                    <div className={`mt-6 flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border transition-colors ${errors.offerSent ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${offerSent ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            {offerSent ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Offer Letter Sent</p>
                            <p className="text-xs text-slate-500">Has the official offer letter been dispatched?</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOfferSent(!offerSent)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${offerSent ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offerSent ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                      {errors.offerSent && (
                        <div className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} />
                          {errors.offerSent}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button Section */}
                  <div className="pt-6 space-y-4">
                    {/* Flagging Warning */}
                    {isFlagged && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 animate-in fade-in zoom-in-95 duration-200">
                        <AlertTriangle size={18} className="shrink-0" />
                        <p className="text-xs font-medium">⚠️ This candidate has more than 2 exceptions. Entry will be flagged for manager review.</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-slate-500">
                        <div className={`w-2 h-2 rounded-full ${activeExceptionCount > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        <span className="text-xs font-medium">Active Exceptions: {activeExceptionCount}</span>
                      </div>
                      {isFlagged && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Flagged for Review</span>}
                    </div>

                    <button
                      disabled={!isValid}
                      type="submit"
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl transition-all shadow-lg ${isValid ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                    >
                      <Send size={18} />
                      Submit Admission Details
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
          </>
        )}
      </motion.div>
    </AnimatePresence>

    {/* Footer Info */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          &copy; 2026 Education Company Admission Portal. All rights reserved.
        </div>
      </div>

      {/* Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" />
                <h3 className="text-xl font-bold text-slate-900">Submission Details</h3>
              </div>
              <button onClick={() => setViewingLog(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name</label>
                  <p className="text-slate-900 font-semibold">{viewingLog.fullName}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</label>
                  <p className="text-slate-900 font-semibold">{viewingLog.email}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</label>
                  <p className="text-slate-900 font-semibold">{viewingLog.phone}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DOB</label>
                  <p className="text-slate-900 font-semibold">{viewingLog.dob}</p>
                </div>
              </div>

              {/* Academic Info */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap size={14} />
                  Academic Profile
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium text-slate-400">Qualification</label>
                    <p className="text-sm font-semibold text-slate-700">{viewingLog.qualification}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400">Grad Year</label>
                    <p className="text-sm font-semibold text-slate-700">{viewingLog.gradYear}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400">{viewingLog.isCgpa ? 'CGPA' : 'Percentage'}</label>
                    <p className="text-sm font-semibold text-slate-700">{viewingLog.score}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400">Screening Score</label>
                    <p className="text-sm font-semibold text-slate-700">{viewingLog.screeningScore}/100</p>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Interview Status</label>
                  <p className={`text-sm font-bold ${viewingLog.status === 'Cleared' ? 'text-emerald-600' : viewingLog.status === 'Waitlisted' ? 'text-amber-600' : 'text-red-600'}`}>
                    {viewingLog.status}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Offer Sent</label>
                  <p className="text-sm font-semibold text-slate-700">{viewingLog.offerSent ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Exceptions Section */}
              {viewingLog.exceptionCount > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Active Exceptions ({viewingLog.exceptionCount})
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(viewingLog.exceptions).map(([field, rationale]) => (
                      <div key={field} className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-800 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-[10px] font-medium text-amber-600 bg-white px-2 py-0.5 rounded-full border border-amber-200">Waiver Granted</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed italic">"{rationale as string}"</p>
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
