import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Send } from 'lucide-react';
import { api } from '../../api';

const FeedbackFormSubmission = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitterInfo, setSubmitterInfo] = useState({ name: '', email: '' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/feedback/form/${formId}`);
      setForm(res.data.data);

      // Initialize form data
      const initialData = {};
      res.data.data.fields.forEach(field => {
        initialData[field.id] = field.type === 'checkbox' ? [] : '';
      });
      setFormData(initialData);

      // Load tasks if form allows task response and the user is authenticated
      if (res.data.data.allowTaskResponse) {
        try {
          if (localStorage.getItem('accessToken')) {
            const taskRes = await api.get(`/tasks?project=${res.data.data.project}`);
            setTasks(taskRes.data.data);
          }
        } catch (taskError) {
          console.warn('Task loading skipped for anonymous visitor', taskError);
          setTasks([]);
        }
      }
    } catch (error) {
      console.error('Failed to load form:', error);
      alert('Form not found or no longer available');
      navigate('/feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData({
      ...formData,
      [fieldId]: value,
    });
  };

  const handleCheckboxChange = (fieldId, value) => {
    const current = formData[fieldId] || [];
    if (current.includes(value)) {
      setFormData({
        ...formData,
        [fieldId]: current.filter(v => v !== value),
      });
    } else {
      setFormData({
        ...formData,
        [fieldId]: [...current, value],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !formData[field.id]) {
        alert(`${field.label} is required`);
        return;
      }
    }

    if (form.collectName && !submitterInfo.name) {
      alert('Your name is required');
      return;
    }

    if (form.collectEmail && !submitterInfo.email) {
      alert('Your email is required');
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
        respondToTask: selectedTask,
      });

      alert('Thank you! Your feedback has been submitted successfully.');
      navigate('/feedback');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Form not found</p>
      </div>
    );
  }

  const totalSteps = Math.ceil(form.fields.length / 3) + (form.allowTaskResponse ? 1 : 0) + 1;
  const pages = [
    {
      title: 'Basic Information',
      fields: ['name', 'email'],
      show: form.collectName || form.collectEmail,
    },
    ...Array.from({ length: Math.ceil(form.fields.length / 3) }, (_, i) => ({
      title: `Questions ${i * 3 + 1}-${Math.min((i + 1) * 3, form.fields.length)}`,
      fields: form.fields.slice(i * 3, (i + 1) * 3),
      show: true,
    })),
    {
      title: form.allowTaskResponse ? 'Link to Task (Optional)' : 'Confirmation',
      show: true,
    },
    {
      title: 'Confirmation',
      show: true,
    },
  ].filter(p => p.show);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && <p className="text-gray-600">{form.description}</p>}

          {/* Progress Bar */}
          {form.showProgressBar && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="bg-white p-8 shadow-lg space-y-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {form.collectName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={submitterInfo.name}
                    onChange={(e) => setSubmitterInfo({ ...submitterInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              {form.collectEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                  <input
                    type="email"
                    value={submitterInfo.email}
                    onChange={(e) => setSubmitterInfo({ ...submitterInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Steps 1+: Form Fields */}
          {currentStep > 0 && currentStep < totalSteps - (form.allowTaskResponse ? 2 : 1) && (
            <div className="space-y-6">
              {form.fields
                .slice((currentStep - 1) * 3, currentStep * 3)
                .map((field) => (
                  <FormField
                    key={field.id}
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    onCheckboxChange={(value) => handleCheckboxChange(field.id, value)}
                  />
                ))}
            </div>
          )}

          {/* Task Link Step */}
          {form.allowTaskResponse && currentStep === totalSteps - 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link this feedback to a task (Optional)
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  If this feedback is related to a specific task, you can link it here.
                </p>
                <select
                  value={selectedTask || ''}
                  onChange={(e) => setSelectedTask(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select a task (optional) --</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === totalSteps - 1 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-6">
                Your feedback has been successfully submitted. We appreciate your input and will review it soon.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>What's next?</strong> Our team will review your feedback and may follow up with you if needed.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={18} />
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Form Field Component
const FormField = ({ field, value, onChange, onCheckboxChange }) => {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );

    case 'email':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Select --</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'radio':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  className="mr-2"
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => onCheckboxChange(option.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'rating':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="transition"
              >
                <Star
                  size={32}
                  className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
        </div>
      );

    case 'file':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600">*</span>}
          </label>
          <input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0])}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      );

    default:
      return null;
  }
};

export default FeedbackFormSubmission;
