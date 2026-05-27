import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Eye, Edit, Trash2, Filter, Copy } from 'lucide-react';
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
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('responses'); // responses or forms
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParts = [];
      if (projectId) queryParts.push(`project=${projectId}`);
      if (filters.status) queryParts.push(`status=${filters.status}`);
      if (filters.category) queryParts.push(`category=${filters.category}`);
      const feedbackQuery = queryParts.length ? `?${queryParts.join('&')}` : '';
      const formsQuery = projectId ? `?project=${projectId}` : '';

      const [feedbackRes, formsRes] = await Promise.all([
        api.get(`/feedback${feedbackQuery}`),
        api.get(`/feedback/forms${formsQuery}`),
      ]);
      setFeedbacks(feedbackRes.data.data);
      setFeedbackForms(formsRes.data.data);
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (confirm('Are you sure you want to delete this feedback?')) {
      try {
        await api.delete(`/feedback/${id}`);
        setFeedbacks(feedbacks.filter(f => f._id !== id));
      } catch (error) {
        console.error('Failed to delete feedback:', error);
      }
    }
  };

  const handleDeleteForm = async (id) => {
    if (confirm('Are you sure you want to delete this form?')) {
      try {
        await api.delete(`/feedback/form/${id}`);
        setFeedbackForms(feedbackForms.filter(f => f._id !== id));
      } catch (error) {
        console.error('Failed to delete form:', error);
      }
    }
  };

  const handlePublishForm = async (id) => {
    if (!confirm('Publish this form and make it available to responders?')) return;

    try {
      await api.post(`/feedback/form/${id}/publish`);
      await loadData();
    } catch (error) {
      console.error('Failed to publish form:', error);
      alert('Unable to publish form. Please try again.');
    }
  };

  const handleCopyLink = async (id) => {
    const url = `${window.location.origin}/feedback/form/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess('Link copied to clipboard!');
      window.setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Unable to copy link. Please copy it manually: ' + url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { value: 'responses', label: 'Feedback Responses', count: feedbacks.length },
    { value: 'forms', label: 'Forms', count: feedbackForms.length }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user feedback responses and custom feedback forms</p>
        </div>
        <Button onClick={() => setShowNewFormModal(true)} className="gap-2">
          <Plus size={20} />
          Create Form
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`pb-4 px-4 font-medium transition-colors border-b-2 -mb-px text-sm flex items-center gap-2 ${
              activeTab === tab.value
                ? 'text-primary border-primary font-semibold'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.value === 'responses' ? <MessageSquare size={18} /> : <Filter size={18} />}
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === tab.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback Responses Tab */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-48"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-48"
            >
              <option value="">All Categories</option>
              <option value="ui_ux">UI/UX</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {/* Feedback List */}
          <div className="grid gap-4">
            {feedbacks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mx-auto mb-4 text-muted-foreground" size={48} />
                  <p className="text-muted-foreground font-medium">No feedback responses yet</p>
                </CardContent>
              </Card>
            ) : (
              feedbacks.map((feedback) => (
                <Card
                  key={feedback._id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{feedback.title}</h3>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={getCategoryColor(feedback.category)}>
                            {feedback.category.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(feedback.status)}>
                            {feedback.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/feedback/${feedback._id}`)}
                        >
                          <Eye size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteFeedback(feedback._id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{feedback.description}</p>
                    <div className="text-xs text-muted-foreground">
                      By: {feedback.submittedBy?.name || 'Anonymous'} • {new Date(feedback.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Forms Tab */}
      {activeTab === 'forms' && (
        <div className="grid gap-4">
          {feedbackForms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Filter className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground font-medium">No feedback forms created yet</p>
              </CardContent>
            </Card>
          ) : (
            feedbackForms.map((form) => (
              <Card
                key={form._id}
                className="hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{form.title}</h3>
                      {form.description && <p className="text-muted-foreground text-sm mt-1">{form.description}</p>}
                      <div className="flex gap-2 mt-3">
                        <Badge variant={getFormStatusColor(form.status)}>
                          {form.status}
                        </Badge>
                        <Badge variant="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {form.totalResponses || 0} responses
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {form.status === 'draft' && (
                        <Button
                          onClick={() => handlePublishForm(form._id)}
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                        >
                          Publish
                        </Button>
                      )}
                      {form.status === 'published' && (
                        <>
                          <Button
                            onClick={() => navigate(`/feedback/form/${form._id}`)}
                            variant="default"
                            size="sm"
                          >
                            Open
                          </Button>
                          <Button
                            onClick={() => handleCopyLink(form._id)}
                            variant="ghost"
                            size="icon"
                          >
                            <Copy size={18} />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => navigate(`/feedback/form/${form._id}/edit`)}
                        variant="ghost"
                        size="icon"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteForm(form._id)}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(form.createdAt).toLocaleDateString()} • Fields: {form.fields?.length || 0}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New Form Modal */}
      {copySuccess && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {copySuccess}
        </div>
      )}
      <Modal open={showNewFormModal} onClose={() => setShowNewFormModal(false)} title="Create Feedback Form" size="xl">
        <FormBuilderModal
          projectId={projectId}
          onClose={() => setShowNewFormModal(false)}
          onSuccess={() => {
            setShowNewFormModal(false);
            loadData();
          }}
        />
      </Modal>
    </div>
  );
};

// Status color helpers (returns Tailwind variant values or custom classes)
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

const getCategoryColor = (category) => {
  const colors = {
    ui_ux: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-none',
    bug: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none',
    suggestion: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-none',
  };
  return colors[category] || 'secondary';
};

const getFormStatusColor = (status) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-none',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none',
    archived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none',
  };
  return colors[status] || 'secondary';
};

// Form Builder Modal Component
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
                    placeholder="Option 1&#10;Option 2"
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
