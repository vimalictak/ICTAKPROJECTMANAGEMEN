import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, CheckCircle2, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { api } from '../../api';

/* ─────────────────────────────────────────────────────────────────────────────
   Google-Forms-inspired public feedback submission page.
   Accessible without login. Single scrollable page, no multi-step wizard.
   ───────────────────────────────────────────────────────────────────────────── */

// ── inline styles (no tailwind dependency for this standalone page) ──────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e8eaf6 0%, #f3e5f5 50%, #ede7f6 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: '0',
    margin: '0',
  },
  container: {
    maxWidth: '680px',
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  /* ── header card ───────────────────────────────────────────── */
  headerCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginBottom: '16px',
  },
  headerAccent: {
    height: '10px',
    background: 'linear-gradient(90deg, #673ab7, #7c4dff, #b388ff)',
  },
  headerBody: {
    padding: '28px 28px 24px',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
    lineHeight: '1.25',
  },
  headerDesc: {
    fontSize: '15px',
    color: '#5f6368',
    margin: '0',
    lineHeight: '1.6',
  },
  requiredNotice: {
    fontSize: '13px',
    color: '#d93025',
    marginTop: '16px',
  },
  /* ── question cards ────────────────────────────────────────── */
  questionCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    borderLeft: '4px solid transparent',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  questionCardFocused: {
    borderLeftColor: '#673ab7',
    boxShadow: '0 4px 16px rgba(103,58,183,0.12)',
  },
  questionCardError: {
    borderLeftColor: '#d93025',
    boxShadow: '0 4px 16px rgba(217,48,37,0.10)',
  },
  label: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#202124',
    marginBottom: '20px',
    display: 'block',
    lineHeight: '1.5',
  },
  required: {
    color: '#d93025',
    marginLeft: '4px',
    fontWeight: '400',
  },
  /* ── inputs ────────────────────────────────────────────────── */
  textInput: {
    width: '100%',
    border: 'none',
    borderBottom: '2px solid #e0e0e0',
    padding: '10px 0',
    fontSize: '15px',
    color: '#202124',
    background: 'transparent',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textInputFocused: {
    borderBottomColor: '#673ab7',
  },
  textarea: {
    width: '100%',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    color: '#202124',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    lineHeight: '1.5',
    boxSizing: 'border-box',
  },
  textareaFocused: {
    borderColor: '#673ab7',
    boxShadow: '0 0 0 2px rgba(103,58,183,0.1)',
  },
  /* ── select ────────────────────────────────────────────────── */
  selectWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '300px',
  },
  select: {
    width: '100%',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '12px 40px 12px 14px',
    fontSize: '15px',
    color: '#202124',
    background: '#fff',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  selectFocused: {
    borderColor: '#673ab7',
  },
  selectIcon: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#5f6368',
  },
  /* ── radio / checkbox ──────────────────────────────────────── */
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontSize: '15px',
    color: '#202124',
  },
  optionLabelHover: {
    background: '#f5f0ff',
  },
  radioOuter: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #5f6368',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  },
  radioOuterChecked: {
    borderColor: '#673ab7',
  },
  radioInner: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#673ab7',
    transform: 'scale(0)',
    transition: 'transform 0.15s',
  },
  radioInnerChecked: {
    transform: 'scale(1)',
  },
  checkboxOuter: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '2px solid #5f6368',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  checkboxOuterChecked: {
    background: '#673ab7',
    borderColor: '#673ab7',
  },
  /* ── rating stars ──────────────────────────────────────────── */
  starsRow: {
    display: 'flex',
    gap: '6px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    transition: 'transform 0.15s',
    borderRadius: '4px',
  },
  starBtnHover: {
    transform: 'scale(1.2)',
  },
  /* ── file ───────────────────────────────────────────────────── */
  fileInput: {
    width: '100%',
    border: '2px dashed #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    color: '#5f6368',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    background: '#fafafa',
    boxSizing: 'border-box',
  },
  /* ── buttons ────────────────────────────────────────────────── */
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: '#673ab7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(103,58,183,0.25)',
  },
  submitBtnHover: {
    background: '#5e35b1',
    boxShadow: '0 4px 16px rgba(103,58,183,0.35)',
  },
  submitBtnDisabled: {
    background: '#bdbdbd',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#673ab7',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  },
  clearBtnHover: {
    background: '#f3e8ff',
  },
  /* ── footer ─────────────────────────────────────────────────── */
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  branding: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '13px',
    color: '#9e9e9e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  brandingBold: {
    fontWeight: '600',
    color: '#673ab7',
  },
  /* ── success screen ─────────────────────────────────────────── */
  successCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
    padding: '48px 28px',
  },
  successIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
  },
  successDesc: {
    fontSize: '15px',
    color: '#5f6368',
    margin: '0 0 28px',
    lineHeight: '1.6',
  },
  submitAnotherBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    color: '#673ab7',
    border: '2px solid #673ab7',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
    fontFamily: 'inherit',
  },
  /* ── loading ────────────────────────────────────────────────── */
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTopColor: '#673ab7',
    borderRadius: '50%',
    animation: 'gf-spin 0.7s linear infinite',
  },
  /* ── error ──────────────────────────────────────────────────── */
  errorCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
    padding: '48px 28px',
  },
  errorIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffebee, #ffcdd2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  fieldError: {
    color: '#d93025',
    fontSize: '13px',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
};

// Keyframes injected once
const injectKeyframes = () => {
  if (document.getElementById('gf-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'gf-keyframes';
  style.textContent = `
    @keyframes gf-spin { to { transform: rotate(360deg); } }
    @keyframes gf-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes gf-success-pop {
      0%   { transform: scale(0); }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .gf-card-enter { animation: gf-fade-up 0.4s ease-out both; }
    .gf-success-pop { animation: gf-success-pop 0.5s ease-out both; }
  `;
  document.head.appendChild(style);
};

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
const FeedbackFormSubmission = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitterInfo, setSubmitterInfo] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [submitHover, setSubmitHover] = useState(false);
  const [clearHover, setClearHover] = useState(false);
  const formRef = useRef(null);

  useEffect(() => { injectKeyframes(); }, []);

  useEffect(() => { loadForm(); }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/feedback/form/${formId}`);
      setForm(res.data.data);

      const initialData = {};
      res.data.data.fields.forEach(field => {
        initialData[field.id] = field.type === 'checkbox' ? [] : '';
      });
      setFormData(initialData);
    } catch (err) {
      console.error('Failed to load form:', err);
      setError('This form is no longer available or the link is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
    }
  };

  const handleCheckboxChange = (fieldId, value) => {
    const current = formData[fieldId] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFormData(prev => ({ ...prev, [fieldId]: updated }));
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
    }
  };

  const validate = () => {
    const errs = {};
    if (form.collectName && !submitterInfo.name.trim()) errs._name = 'This is a required question';
    if (form.collectEmail && !submitterInfo.email.trim()) errs._email = 'This is a required question';
    if (form.collectEmail && submitterInfo.email && !/\S+@\S+\.\S+/.test(submitterInfo.email)) {
      errs._email = 'Please enter a valid email address';
    }
    form.fields.forEach(field => {
      if (field.required) {
        const val = formData[field.id];
        if (val === '' || val === undefined || val === null || (Array.isArray(val) && val.length === 0)) {
          errs[field.id] = 'This is a required question';
        }
      }
    });
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      // Scroll to first error
      const firstErrKey = Object.keys(errs)[0];
      const el = document.getElementById(`field-${firstErrKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      setSubmitting(true);
      const customFields = form.fields.map(field => ({
        fieldId: field.id,
        label: field.label,
        value: formData[field.id],
      }));

      await api.post('/feedback', {
        projectId: form.project,
        formId,
        customFields,
        submitterName: submitterInfo.name,
        submitterEmail: submitterInfo.email,
        category: formData.category || 'other',
      });

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    const initialData = {};
    form.fields.forEach(field => {
      initialData[field.id] = field.type === 'checkbox' ? [] : '';
    });
    setFormData(initialData);
    setSubmitterInfo({ name: '', email: '' });
    setFieldErrors({});
  };

  const handleSubmitAnother = () => {
    handleClear();
    setSubmitted(false);
  };

  // ── LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={{ color: '#5f6368', fontSize: '15px' }}>Loading form…</span>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────
  if (error || !form) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorCard} className="gf-card-enter">
            <div style={styles.headerAccent} />
            <div style={{ padding: '48px 28px' }}>
              <div style={styles.errorIcon}>
                <AlertCircle size={36} color="#d93025" />
              </div>
              <h1 style={{ ...styles.headerTitle, marginBottom: '12px' }}>Form Not Available</h1>
              <p style={styles.headerDesc}>
                {error || 'This form could not be found. It may have been deleted or the link is incorrect.'}
              </p>
            </div>
          </div>
          <div style={styles.branding}>
            <span style={styles.brandingBold}>ProjectFlow</span>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ──────────────────────────────────────────
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {/* Keep the header card visible */}
          <div style={styles.headerCard} className="gf-card-enter">
            <div style={styles.headerAccent} />
            <div style={styles.headerBody}>
              <h1 style={styles.headerTitle}>{form.title}</h1>
            </div>
          </div>

          <div style={styles.successCard} className="gf-card-enter">
            <div style={styles.successIcon} className="gf-success-pop">
              <CheckCircle2 size={36} color="#2e7d32" />
            </div>
            <h2 style={styles.successTitle}>Your response has been recorded</h2>
            <p style={styles.successDesc}>
              Thank you for your feedback! We appreciate your time and input.
            </p>
            <button
              onClick={handleSubmitAnother}
              style={styles.submitAnotherBtn}
              onMouseEnter={e => { e.target.style.background = '#673ab7'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#673ab7'; }}
            >
              Submit another response
            </button>
          </div>
          <div style={styles.branding}>
            <span style={styles.brandingBold}>ProjectFlow</span>
          </div>
        </div>
      </div>
    );
  }

  // ── CHECK FOR REQUIRED FIELDS ─────────────────────────────
  const hasRequired = form.fields.some(f => f.required) || form.collectName || form.collectEmail;

  // ── MAIN FORM ──────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ─── HEADER CARD ─────────────────────────────────── */}
        <div style={styles.headerCard} className="gf-card-enter">
          <div style={styles.headerAccent} />
          <div style={styles.headerBody}>
            <h1 style={styles.headerTitle}>{form.title}</h1>
            {form.description && <p style={styles.headerDesc}>{form.description}</p>}
            {hasRequired && (
              <p style={styles.requiredNotice}>* Indicates required question</p>
            )}
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          {/* ─── SUBMITTER INFO (name / email) ─────────────── */}
          {(form.collectName || form.collectEmail) && (
            <div
              id="field-_name"
              className="gf-card-enter"
              style={{
                ...styles.questionCard,
                ...(focusedField === '_name' || focusedField === '_email' ? styles.questionCardFocused : {}),
                ...((fieldErrors._name || fieldErrors._email) ? styles.questionCardError : {}),
                animationDelay: '0.05s',
              }}
            >
              {form.collectName && (
                <div style={{ marginBottom: form.collectEmail ? '24px' : '0' }}>
                  <label style={styles.label}>
                    Your Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={submitterInfo.name}
                    onChange={e => setSubmitterInfo({ ...submitterInfo, name: e.target.value })}
                    onFocus={() => setFocusedField('_name')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.textInput,
                      ...(focusedField === '_name' ? styles.textInputFocused : {}),
                    }}
                  />
                  {fieldErrors._name && (
                    <div style={styles.fieldError}>
                      <AlertCircle size={14} /> {fieldErrors._name}
                    </div>
                  )}
                </div>
              )}
              {form.collectEmail && (
                <div id="field-_email">
                  <label style={styles.label}>
                    Your Email <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={submitterInfo.email}
                    onChange={e => setSubmitterInfo({ ...submitterInfo, email: e.target.value })}
                    onFocus={() => setFocusedField('_email')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.textInput,
                      ...(focusedField === '_email' ? styles.textInputFocused : {}),
                    }}
                  />
                  {fieldErrors._email && (
                    <div style={styles.fieldError}>
                      <AlertCircle size={14} /> {fieldErrors._email}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── FORM FIELDS (one card each) ──────────────── */}
          {form.fields.map((field, idx) => (
            <div
              key={field.id}
              id={`field-${field.id}`}
              className="gf-card-enter"
              style={{
                ...styles.questionCard,
                ...(focusedField === field.id ? styles.questionCardFocused : {}),
                ...(fieldErrors[field.id] ? styles.questionCardError : {}),
                animationDelay: `${(idx + 1) * 0.05}s`,
              }}
            >
              <FormField
                field={field}
                value={formData[field.id]}
                onChange={val => handleFieldChange(field.id, val)}
                onCheckboxChange={val => handleCheckboxChange(field.id, val)}
                onFocus={() => setFocusedField(field.id)}
                onBlur={() => setFocusedField(null)}
                focused={focusedField === field.id}
                error={fieldErrors[field.id]}
              />
            </div>
          ))}

          {/* ─── SUBMIT ROW ───────────────────────────────── */}
          <div style={styles.footerRow}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                ...(submitting ? styles.submitBtnDisabled : {}),
                ...(submitHover && !submitting ? styles.submitBtnHover : {}),
              }}
              onMouseEnter={() => setSubmitHover(true)}
              onMouseLeave={() => setSubmitHover(false)}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'gf-spin 0.7s linear infinite' }} />
                  Submitting…
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                ...styles.clearBtn,
                ...(clearHover ? styles.clearBtnHover : {}),
              }}
              onMouseEnter={() => setClearHover(true)}
              onMouseLeave={() => setClearHover(false)}
            >
              Clear form
            </button>
          </div>
        </form>

        {/* ─── BRANDING ───────────────────────────────────── */}
        <div style={styles.branding}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect width="24" height="24" rx="4" fill="#673ab7" />
            <path d="M6 6h7a4 4 0 010 8H6V6z" fill="white" />
            <rect x="6" y="16" width="12" height="2.5" rx="1.25" fill="white" opacity="0.7" />
          </svg>
          <span style={styles.brandingBold}>ProjectFlow</span>
        </div>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════════
   FORM FIELD COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
const FormField = ({ field, value, onChange, onCheckboxChange, onFocus, onBlur, focused, error }) => {
  const [hoverOption, setHoverOption] = useState(null);
  const [hoverStar, setHoverStar] = useState(null);

  const fieldLabel = (
    <label style={styles.label}>
      {field.label}
      {field.required && <span style={styles.required}>*</span>}
    </label>
  );

  const fieldError = error ? (
    <div style={styles.fieldError}>
      <AlertCircle size={14} /> {error}
    </div>
  ) : null;

  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <>
          {fieldLabel}
          <input
            type={field.type === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || 'Your answer'}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
              ...styles.textInput,
              ...(focused ? styles.textInputFocused : {}),
            }}
          />
          {fieldError}
        </>
      );

    case 'textarea':
      return (
        <>
          {fieldLabel}
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || 'Your answer'}
            onFocus={onFocus}
            onBlur={onBlur}
            rows="4"
            style={{
              ...styles.textarea,
              ...(focused ? styles.textareaFocused : {}),
            }}
          />
          {fieldError}
        </>
      );

    case 'select':
      return (
        <>
          {fieldLabel}
          <div style={styles.selectWrapper}>
            <select
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              style={{
                ...styles.select,
                ...(focused ? styles.selectFocused : {}),
                ...(value ? {} : { color: '#9e9e9e' }),
              }}
            >
              <option value="" disabled>Choose</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value} style={{ color: '#202124' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={18} style={styles.selectIcon} />
          </div>
          {fieldError}
        </>
      );

    case 'radio':
      return (
        <>
          {fieldLabel}
          <div style={styles.optionsList}>
            {field.options?.map(opt => {
              const checked = value === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    ...styles.optionLabel,
                    ...(hoverOption === opt.value ? styles.optionLabelHover : {}),
                  }}
                  onMouseEnter={() => setHoverOption(opt.value)}
                  onMouseLeave={() => setHoverOption(null)}
                  onClick={() => onChange(opt.value)}
                >
                  <div style={{
                    ...styles.radioOuter,
                    ...(checked ? styles.radioOuterChecked : {}),
                  }}>
                    <div style={{
                      ...styles.radioInner,
                      ...(checked ? styles.radioInnerChecked : {}),
                    }} />
                  </div>
                  <span>{opt.label}</span>
                  <input type="radio" name={field.id} value={opt.value} checked={checked} onChange={() => {}} style={{ display: 'none' }} />
                </label>
              );
            })}
          </div>
          {fieldError}
        </>
      );

    case 'checkbox':
      return (
        <>
          {fieldLabel}
          <div style={styles.optionsList}>
            {field.options?.map(opt => {
              const checked = (value || []).includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    ...styles.optionLabel,
                    ...(hoverOption === opt.value ? styles.optionLabelHover : {}),
                  }}
                  onMouseEnter={() => setHoverOption(opt.value)}
                  onMouseLeave={() => setHoverOption(null)}
                  onClick={() => onCheckboxChange(opt.value)}
                >
                  <div style={{
                    ...styles.checkboxOuter,
                    ...(checked ? styles.checkboxOuterChecked : {}),
                  }}>
                    {checked && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span>{opt.label}</span>
                  <input type="checkbox" value={opt.value} checked={checked} onChange={() => {}} style={{ display: 'none' }} />
                </label>
              );
            })}
          </div>
          {fieldError}
        </>
      );

    case 'rating':
      return (
        <>
          {fieldLabel}
          <div style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => {
              const filled = star <= (hoverStar ?? value);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => onChange(star)}
                  onMouseEnter={() => setHoverStar(star)}
                  onMouseLeave={() => setHoverStar(null)}
                  style={{
                    ...styles.starBtn,
                    ...(hoverStar === star ? styles.starBtnHover : {}),
                  }}
                >
                  <Star
                    size={36}
                    fill={filled ? '#ffc107' : 'none'}
                    color={filled ? '#ffc107' : '#dadce0'}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
          {fieldError}
        </>
      );

    case 'file':
      return (
        <>
          {fieldLabel}
          <input
            type="file"
            onChange={e => onChange(e.target.files?.[0])}
            style={styles.fileInput}
          />
          {fieldError}
        </>
      );

    default:
      return null;
  }
};

export default FeedbackFormSubmission;
