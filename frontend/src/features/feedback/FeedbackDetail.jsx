import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ArrowLeft, Link2, FileText } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Spinner
} from '../../components/ui/index';

const FeedbackDetail = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/feedback/${feedbackId}`);
        setFeedback(res.data.data);
      } catch (error) {
        console.error('Failed to load feedback:', error);
        alert('Unable to load feedback details');
        navigate('/feedback');
      } finally {
        setLoading(false);
      }
    };
    loadFeedback();
  }, [feedbackId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground font-medium">Feedback not found.</p>
            <Button onClick={() => navigate('/feedback')} variant="outline" className="mt-4 gap-2">
              <ArrowLeft size={16} /> Back to Feedback
            </Button>
          </CardContent>
        </Card>
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
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{feedback.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Submitted by <span className="font-medium text-foreground">{feedback.submittedBy?.name || 'Anonymous'}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={getCategoryColor(feedback.category)}>
                {feedback.category?.replace(/_/g, ' ') || 'General'}
              </Badge>
              <Badge variant={getStatusColor(feedback.status)}>
                {feedback.status?.replace(/_/g, ' ') || 'Submitted'}
              </Badge>
            </div>
          </div>

          <div className="space-y-6">
            {feedback.description && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Description</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
                  {feedback.description}
                </p>
              </div>
            )}

            {feedback.customFields?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Form Responses</h2>
                <div className="grid gap-4">
                  {feedback.customFields.map((field) => (
                    <div key={field.fieldId} className="rounded-xl border border-border p-4 bg-muted/20">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</div>
                      <div className="mt-2 text-sm text-foreground whitespace-pre-line">{String(field.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedback.respondToTaskTitle && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 p-4 text-blue-800 dark:text-blue-300">
                <Link2 size={18} className="shrink-0" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider">Linked Task</div>
                  <div className="text-sm font-medium mt-1">{feedback.respondToTaskTitle}</div>
                </div>
              </div>
            )}

            {feedback.attachments?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
                <ul className="space-y-2">
                  {feedback.attachments.map((attachment) => (
                    <li key={attachment.url} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <FileText size={16} className="shrink-0" />
                      <a href={attachment.url} target="_blank" rel="noreferrer">
                        {attachment.name || attachment.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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

export default FeedbackDetail;
