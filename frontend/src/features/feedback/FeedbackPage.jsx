import React, { useState, useEffect } from 'react';
import {
  Plus, MessageSquare, Eye, Edit, Trash2, Copy, ExternalLink,
  FileText, Users, ChevronDown, ChevronRight, Star, BarChart3,
  Clock, Send, Link2, Search, Archive, Globe
} from 'lucide-react';
import { api } from '../../api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  Input,
  Textarea,
  Select,
  Card,
  CardContent,
  FormField,
  Modal,
  Spinner
} from '../../components/ui/index';

const FeedbackPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [expandedFormId, setExpandedFormId] = useState(null);
  const [formResponses, setFormResponses] = useState({}); // { formId: [...responses] }
  const [loadingResponses, setLoadingResponses] = useState({});
  const [activeFormTab, setActiveFormTab] = useState({}); // { formId: 'responses' | 'questions' }
  const [responseView, setResponseView] = useState({}); // { formId: 'summary' | 'individual' }
  const [selectedResponseIdx, setSelectedResponseIdx] = useState({}); // { formId: idx }
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadForms(); }, [projectId]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const formsQuery = projectId ? `?project=${projectId}` : '';
      const res = await api.get(`/feedback/forms${formsQuery}`);
      setForms(res.data.data || []);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFormResponses = async (formId) => {
    if (formResponses[formId]) return; // already loaded
    try {
      setLoadingResponses(prev => ({ ...prev, [formId]: true }));
      const res = await api.get(`/feedback?formId=${formId}`);
      setFormResponses(prev => ({ ...prev, [formId]: res.data.data || [] }));
    } catch (error) {
      console.error('Failed to load responses:', error);
      setFormResponses(prev => ({ ...prev, [formId]: [] }));
    } finally {
      setLoadingResponses(prev => ({ ...prev, [formId]: false }));
    }
  };

  const toggleForm = (formId) => {
    if (expandedFormId === formId) {
      setExpandedFormId(null);
    } else {
      setExpandedFormId(formId);
      setActiveFormTab(prev => ({ ...prev, [formId]: prev[formId] || 'responses' }));
      setResponseView(prev => ({ ...prev, [formId]: 'summary' }));
      loadFormResponses(formId);
    }
  };

  const handleDeleteForm = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this form and all its responses?')) return;
    try {
      await api.delete(`/feedback/form/${id}`);
      setForms(forms.filter(f => f._id !== id));
      if (expandedFormId === id) setExpandedFormId(null);
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const handlePublishForm = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Publish this form and make it available to anyone with the link?')) return;
    try {
      await api.post(`/feedback/form/${id}/publish`);
      await loadForms();
    } catch (error) {
      console.error('Failed to publish form:', error);
    }
  };

  const handleArchiveForm = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Archive this form? It will stop accepting responses.')) return;
    try {
      await api.post(`/feedback/form/${id}/archive`);
      await loadForms();
    } catch (error) {
      console.error('Failed to archive form:', error);
    }
  };

  const handleCopyLink = async (id, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/feedback/form/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch {
      prompt('Copy this link:', url);
    }
  };

  const handleDeleteResponse = async (feedbackId, formId) => {
    if (!confirm('Delete this response?')) return;
    try {
      await api.delete(`/feedback/${feedbackId}`);
      setFormResponses(prev => ({
        ...prev,
        [formId]: prev[formId].filter(r => r._id !== feedbackId),
      }));
      // update form count
      setForms(prev => prev.map(f => f._id === formId ? { ...f, totalResponses: (f.totalResponses || 1) - 1 } : f));
    } catch (error) {
      console.error('Failed to delete response:', error);
    }
  };

  const filteredForms = forms.filter(f =>
    !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create forms, share links, and view responses — all in one place
          </p>
        </div>
        <Button onClick={() => setShowNewFormModal(true)} className="gap-2">
          <Plus size={20} />
          Create Form
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search forms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground font-medium text-lg">
              {searchQuery ? 'No forms match your search' : 'No feedback forms yet'}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {!searchQuery && 'Create your first form to start collecting feedback'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowNewFormModal(true)} className="mt-4 gap-2" variant="outline">
                <Plus size={18} /> Create Form
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredForms.map(form => (
            <FormCard
              key={form._id}
              form={form}
              isExpanded={expandedFormId === form._id}
              onToggle={() => toggleForm(form._id)}
              onEdit={(e) => { e.stopPropagation(); navigate(`/feedback/form/${form._id}/edit`); }}
              onDelete={(e) => handleDeleteForm(form._id, e)}
              onPublish={(e) => handlePublishForm(form._id, e)}
              onArchive={(e) => handleArchiveForm(form._id, e)}
              onCopyLink={(e) => handleCopyLink(form._id, e)}
              onOpen={(e) => { e.stopPropagation(); window.open(`/feedback/form/${form._id}`, '_blank'); }}
              copySuccess={copySuccess === form._id}
              responses={formResponses[form._id] || []}
              loadingResponses={loadingResponses[form._id]}
              activeTab={activeFormTab[form._id] || 'responses'}
              onTabChange={(tab) => setActiveFormTab(prev => ({ ...prev, [form._id]: tab }))}
              viewMode={responseView[form._id] || 'summary'}
              onViewModeChange={(mode) => setResponseView(prev => ({ ...prev, [form._id]: mode }))}
              selectedIdx={selectedResponseIdx[form._id] || 0}
              onSelectIdx={(idx) => setSelectedResponseIdx(prev => ({ ...prev, [form._id]: idx }))}
              onDeleteResponse={(feedbackId) => handleDeleteResponse(feedbackId, form._id)}
              onViewResponse={(feedbackId) => navigate(`/feedback/${feedbackId}`)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {copySuccess && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <Copy size={16} /> Link copied to clipboard!
        </div>
      )}

      {/* New Form Modal */}
      <Modal open={showNewFormModal} onClose={() => setShowNewFormModal(false)} title="Create Feedback Form" size="xl">
        <FormBuilderModal
          projectId={projectId}
          onClose={() => setShowNewFormModal(false)}
          onSuccess={() => { setShowNewFormModal(false); loadForms(); }}
        />
      </Modal>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════════
   FORM CARD — Google Forms admin-style card with Questions + Responses tabs
   ═══════════════════════════════════════════════════════════════════════════════ */
const FormCard = ({
  form, isExpanded, onToggle, onEdit, onDelete, onPublish, onArchive,
  onCopyLink, onOpen, copySuccess, responses, loadingResponses,
  activeTab, onTabChange, viewMode, onViewModeChange,
  selectedIdx, onSelectIdx, onDeleteResponse, onViewResponse,
}) => {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-none',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none',
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:border-primary/30'}`}>
      {/* ── Collapsed header ─────────────────────── */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer select-none group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/5'}`}>
            <FileText size={22} className={isExpanded ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-foreground truncate">{form.title}</h3>
              <Badge variant={statusColors[form.status]} className="shrink-0 capitalize text-[11px]">
                {form.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={13} /> {form.totalResponses || 0} responses
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={13} /> {form.fields?.length || 0} questions
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} /> {new Date(form.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {form.status === 'draft' && (
            <Button onClick={onPublish} variant="default" size="sm"
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700">
              <Send size={14} className="mr-1.5" /> Publish
            </Button>
          )}
          {form.status === 'published' && (
            <>
              <Button onClick={onOpen} variant="outline" size="sm" className="gap-1.5">
                <ExternalLink size={14} /> Open
              </Button>
              <Button onClick={onCopyLink} variant="ghost" size="icon" title="Copy form link">
                <Copy size={16} />
              </Button>
            </>
          )}
          <Button onClick={onEdit} variant="ghost" size="icon" title="Edit form">
            <Edit size={16} />
          </Button>
          {form.status === 'published' && (
            <Button onClick={onArchive} variant="ghost" size="icon" title="Archive form"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20">
              <Archive size={16} />
            </Button>
          )}
          <Button onClick={onDelete} variant="ghost" size="icon" title="Delete form"
            className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 size={16} />
          </Button>
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Expanded panel ────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Google-Forms-style tabs: Questions | Responses */}
          <div className="flex border-b border-border bg-muted/30">
            <button
              onClick={() => onTabChange('questions')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'questions'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <FileText size={16} /> Questions
            </button>
            <button
              onClick={() => onTabChange('responses')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'responses'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Users size={16} /> Responses
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                activeTab === 'responses' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {responses.length}
              </span>
            </button>
          </div>

          {/* ── Questions Tab ──────────────── */}
          {activeTab === 'questions' && (
            <div className="p-6 space-y-4">
              {form.description && (
                <p className="text-sm text-muted-foreground pb-4 border-b border-border">{form.description}</p>
              )}

              {/* Settings summary */}
              <div className="flex flex-wrap gap-2 pb-4">
                {form.collectName && <Badge variant="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Collects name</Badge>}
                {form.collectEmail && <Badge variant="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Collects email</Badge>}
                {form.allowTaskResponse && <Badge variant="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Task linking</Badge>}
                {form.showProgressBar && <Badge variant="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none">Progress bar</Badge>}
              </div>

              {/* Field list */}
              {form.fields?.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{field.label}</span>
                      {field.required && <span className="text-red-500 text-xs">Required</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="bg-muted text-muted-foreground border-none" className="text-[11px] capitalize">
                        {field.type}
                      </Badge>
                      {field.options?.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                          {' · '}
                          {field.options.map(o => o.label).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Share link */}
              {form.status === 'published' && (
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <Globe size={18} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-primary mb-1">Public Form Link</div>
                    <code className="text-xs text-muted-foreground truncate block">
                      {window.location.origin}/feedback/form/{form._id}
                    </code>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/feedback/form/${form._id}`); }} size="sm" variant="outline" className="shrink-0 gap-1.5">
                    <Copy size={14} /> Copy
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Responses Tab ─────────────── */}
          {activeTab === 'responses' && (
            <div className="p-6">
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : responses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 text-muted-foreground" size={40} />
                  <p className="text-muted-foreground font-medium">No responses yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Share the form link to start collecting feedback</p>
                  {form.status === 'published' && (
                    <Button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/feedback/form/${form._id}`); setCopySuccess(form._id); setTimeout(() => setCopySuccess(''), 3000); }} variant="outline" size="sm" className="mt-4 gap-1.5">
                      <Copy size={14} /> Copy link
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* View mode toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                      <button
                        onClick={() => onViewModeChange('summary')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          viewMode === 'summary' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <BarChart3 size={14} className="inline mr-1.5" />
                        Summary
                      </button>
                      <button
                        onClick={() => onViewModeChange('individual')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          viewMode === 'individual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Eye size={14} className="inline mr-1.5" />
                        Individual
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">{responses.length} response{responses.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Summary View */}
                  {viewMode === 'summary' && (
                    <ResponseSummary responses={responses} form={form} onDeleteResponse={onDeleteResponse} onViewResponse={onViewResponse} />
                  )}

                  {/* Individual View */}
                  {viewMode === 'individual' && (
                    <ResponseIndividual
                      responses={responses}
                      form={form}
                      selectedIdx={selectedIdx}
                      onSelectIdx={onSelectIdx}
                      onDeleteResponse={onDeleteResponse}
                      onViewResponse={onViewResponse}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSE SUMMARY — aggregate view of all responses (like Google Forms Summary)
   ═══════════════════════════════════════════════════════════════════════════════ */
const ResponseSummary = ({ responses, form, onDeleteResponse, onViewResponse }) => {
  // Build summary data per field
  const fieldSummaries = (form.fields || []).map(field => {
    const values = responses
      .map(r => r.customFields?.find(cf => cf.fieldId === field.id)?.value)
      .filter(v => v !== undefined && v !== null && v !== '');

    if (['select', 'radio'].includes(field.type)) {
      const counts = {};
      values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const total = values.length;
      return { field, type: 'bar', data: counts, total };
    }
    if (field.type === 'checkbox') {
      const counts = {};
      values.flat().forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const total = values.length;
      return { field, type: 'bar', data: counts, total };
    }
    if (field.type === 'rating') {
      const sum = values.reduce((a, b) => a + (Number(b) || 0), 0);
      const avg = values.length ? (sum / values.length).toFixed(1) : 0;
      const dist = {};
      [1, 2, 3, 4, 5].forEach(n => { dist[n] = 0; });
      values.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
      return { field, type: 'rating', avg, distribution: dist, total: values.length };
    }
    return { field, type: 'text', values };
  });

  return (
    <div className="space-y-5">
      {fieldSummaries.map(summary => (
        <div key={summary.field.id} className="rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-3">{summary.field.label}</div>

          {summary.type === 'bar' && (
            <div className="space-y-2">
              {Object.entries(summary.data).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
                // Find display label from options if available
                const optLabel = summary.field.options?.find(o => o.value === label)?.label || label;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 truncate shrink-0" title={optLabel}>{optLabel}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-primary/70 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-14 text-right shrink-0">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}

          {summary.type === 'rating' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{summary.avg}</div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={16} className={s <= Math.round(summary.avg) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{summary.total} responses</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(n => {
                  const count = summary.distribution[n] || 0;
                  const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-3">{n}</span>
                      <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary.type === 'text' && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {summary.values.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No responses for this question</p>
              ) : (
                summary.values.map((val, i) => (
                  <div key={i} className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border border-border">
                    {String(val)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {/* Recent responses table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">All Responses</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Submitted By</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Email</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r, i) => (
                <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium text-foreground">{r.submitterName || r.submittedBy?.name || 'Anonymous'}</td>
                  <td className="p-3 text-muted-foreground">{r.submitterEmail || r.submittedBy?.email || '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <Badge variant={getStatusColor(r.status)} className="text-[11px] capitalize">
                      {r.status?.replace(/_/g, ' ') || 'submitted'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => onViewResponse(r._id)} title="View details">
                        <Eye size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDeleteResponse(r._id)} title="Delete">
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSE INDIVIDUAL — browse one response at a time (like Google Forms Individual)
   ═══════════════════════════════════════════════════════════════════════════════ */
const ResponseIndividual = ({ responses, form, selectedIdx, onSelectIdx, onDeleteResponse, onViewResponse }) => {
  const current = responses[selectedIdx];
  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* Navigator */}
      <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border">
        <Button variant="ghost" size="sm" disabled={selectedIdx === 0}
          onClick={() => onSelectIdx(selectedIdx - 1)}>
          ← Previous
        </Button>
        <span className="text-sm text-foreground font-medium">
          {selectedIdx + 1} of {responses.length}
        </span>
        <Button variant="ghost" size="sm" disabled={selectedIdx === responses.length - 1}
          onClick={() => onSelectIdx(selectedIdx + 1)}>
          Next →
        </Button>
      </div>

      {/* Response card */}
      <div className="rounded-xl border border-border p-6 space-y-5">
        {/* Metadata */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {current.submitterName || current.submittedBy?.name || 'Anonymous'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {current.submitterEmail || current.submittedBy?.email || ''}
              {' · '}
              {new Date(current.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(current.status)} className="capitalize text-[11px]">
              {current.status?.replace(/_/g, ' ') || 'submitted'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => onViewResponse(current._id)} title="Full detail">
              <ExternalLink size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteResponse(current._id)} title="Delete response">
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        {/* Answers */}
        {(form.fields || []).map(field => {
          const cf = current.customFields?.find(c => c.fieldId === field.id);
          const val = cf?.value;
          return (
            <div key={field.id} className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</div>
              <div className="text-sm text-foreground bg-muted/30 rounded-lg p-3 border border-border min-h-[36px]">
                {val !== undefined && val !== null && val !== ''
                  ? (field.type === 'rating'
                    ? <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={18} className={s <= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />)}</div>
                    : Array.isArray(val) ? val.join(', ') : String(val))
                  : <span className="text-muted-foreground italic">No answer</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */
const getStatusColor = (status) => {
  const colors = {
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-none',
    under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-none',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none',
    converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-none',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-none',
  };
  return colors[status] || 'secondary';
};


/* ═══════════════════════════════════════════════════════════════════════════════
   FORM BUILDER MODAL  (unchanged from original)
   ═══════════════════════════════════════════════════════════════════════════════ */
const FormBuilderModal = ({ projectId, onClose, onSuccess }) => {
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState([
    { id: 'category', label: 'Category', type: 'select', required: true, options: [
      { label: 'UI/UX', value: 'ui_ux' },
      { label: 'Bug', value: 'bug' },
      { label: 'Suggestion', value: 'suggestion' },
      { label: 'Other', value: 'other' },
    ]},
  ]);
  const [categories, setCategories] = useState(['ui_ux', 'bug', 'suggestion', 'other']);
  const [settings, setSettings] = useState({
    allowTaskResponse: true,
    collectEmail: true,
    collectName: true,
    showProgressBar: true,
  });
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      api.get('/projects')
        .then((res) => setProjectOptions(res.data.data || []))
        .catch((error) => console.error('Failed to load projects for feedback form:', error));
    }
  }, [projectId]);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetProjectId = projectId || selectedProjectId;
    if (!formTitle.trim() || fields.length === 0 || !targetProjectId) {
      alert('Form title, project, and at least one field are required');
      return;
    }

    try {
      setSaving(true);
      await api.post('/feedback/form', {
        projectId: targetProjectId,
        title: formTitle,
        description: formDescription,
        fields,
        categories,
        ...settings,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create form:', error);
      alert('Failed to create form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 mt-4">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Form Title" required>
          <Input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g., Product Feedback Form"
            required
          />
        </FormField>

        {!projectId && (
          <FormField label="Project" required>
            <Select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
            >
              <option value="">Select a project</option>
              {projectOptions.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </div>

      <FormField label="Description">
        <Textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Optional description for the form"
          rows="3"
        />
      </FormField>

      {/* Settings */}
      <div className="bg-muted/40 p-5 rounded-xl border space-y-3">
        <h3 className="font-semibold text-sm text-foreground">Form Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings.allowTaskResponse}
              onChange={(e) => setSettings({ ...settings, allowTaskResponse: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
            />
            Allow responders to link to a task
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings.collectEmail}
              onChange={(e) => setSettings({ ...settings, collectEmail: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
            />
            Collect email address
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings.collectName}
              onChange={(e) => setSettings({ ...settings, collectName: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
            />
            Collect name
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings.showProgressBar}
              onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
            />
            Show progress bar
          </label>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-foreground">Form Fields</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
          >
            + Add Field
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="bg-muted/30 p-4 rounded-xl border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Label" required>
                  <Input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="e.g. Rate your experience"
                    required
                  />
                </FormField>

                <FormField label="Type" required>
                  <Select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="email">Email</option>
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="rating">Rating</option>
                    <option value="file">File</option>
                  </Select>
                </FormField>

                <div className="flex items-end justify-between gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground mb-2.5">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
                    />
                    Required
                  </label>
                  {field.id !== 'category' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeField(field.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                <FormField label="Options (one per line)">
                  <Textarea
                    value={field.options?.map(o => o.label).join('\n') || ''}
                    onChange={(e) => {
                      const options = e.target.value.split('\n').filter(Boolean).map(label => ({
                        label,
                        value: label.toLowerCase().replace(/\s+/g, '_'),
                      }));
                      updateField(field.id, { options });
                    }}
                    rows={3}
                    placeholder={"Option 1\nOption 2"}
                  />
                </FormField>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          loading={saving}
        >
          Create Form
        </Button>
      </div>
    </form>
  );
};

export default FeedbackPage;
