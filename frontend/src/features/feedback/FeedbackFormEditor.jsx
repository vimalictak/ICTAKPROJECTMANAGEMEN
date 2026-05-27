import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Textarea,
  Select,
  Spinner
} from '../../components/ui/index';

const FeedbackFormEditor = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [settings, setSettings] = useState({
    allowTaskResponse: true,
    collectEmail: true,
    collectName: true,
    showProgressBar: true,
  });
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/feedback/form/${formId}`);
        const form = res.data.data;
        setFormTitle(form.title);
        setFormDescription(form.description || '');
        setFields(form.fields || []);
        setSettings({
          allowTaskResponse: form.allowTaskResponse,
          collectEmail: form.collectEmail,
          collectName: form.collectName,
          showProgressBar: form.showProgressBar,
        });
        setStatus(form.status);
      } catch (error) {
        console.error('Failed to load form:', error);
        alert('Unable to load form for editing');
        navigate('/feedback');
      } finally {
        setLoading(false);
      }
    };
    loadForm();
  }, [formId, navigate]);

  const updateField = (id, updates) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        options: [],
      },
    ]);
  };

  const removeField = (id) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formTitle.trim()) {
      alert('Form title is required');
      return;
    }

    try {
      setSaving(true);
      await api.patch(`/feedback/form/${formId}`, {
        title: formTitle,
        description: formDescription,
        fields,
        allowTaskResponse: settings.allowTaskResponse,
        collectEmail: settings.collectEmail,
        collectName: settings.collectName,
        showProgressBar: settings.showProgressBar,
      });
      alert('Form updated successfully');
      navigate('/feedback');
    } catch (error) {
      console.error('Failed to update form:', error);
      alert('Unable to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Button
        onClick={() => navigate('/feedback')}
        variant="ghost"
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={18} /> Back to Feedback
      </Button>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Feedback Form</h1>
              <p className="text-sm text-muted-foreground mt-1">Form Status: <span className="font-medium text-foreground capitalize">{status}</span></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Form Title" required>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. User Feedback Form"
                  required
                />
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Form description..."
                rows={4}
              />
            </FormField>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Form Fields</h2>
                <Button
                  type="button"
                  onClick={addField}
                  variant="outline"
                  size="sm"
                >
                  + Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <FormField label="Label" required>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          placeholder="e.g. How satisfied are you?"
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

                      <div className="flex items-center justify-between gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground mb-2.5">
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
                          />
                          Required
                        </label>
                        {field.id !== 'category' && (
                          <Button
                            type="button"
                            onClick={() => removeField(field.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    {['select', 'radio', 'checkbox'].includes(field.type) && (
                      <FormField label="Options (one per line)">
                        <Textarea
                          value={(field.options || []).map((item) => item.label).join('\n')}
                          onChange={(e) => {
                            const options = e.target.value
                              .split('\n')
                              .filter(Boolean)
                              .map((label) => ({ label, value: label.toLowerCase().replace(/\s+/g, '_') }));
                            updateField(field.id, { options });
                          }}
                          placeholder="Option 1&#10;Option 2"
                          rows={3}
                        />
                      </FormField>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-muted/40 p-5 rounded-xl border space-y-3">
              <h2 className="text-base font-semibold text-foreground">Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={settings.allowTaskResponse}
                    onChange={(e) => setSettings({ ...settings, allowTaskResponse: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
                  />
                  Allow task linking
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={settings.collectEmail}
                    onChange={(e) => setSettings({ ...settings, collectEmail: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background"
                  />
                  Collect email
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

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={() => navigate('/feedback')}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackFormEditor;
