import { useEffect } from 'react';

export interface Feedback {
  id: number;
  phase: 'saving' | 'waiting' | 'success' | 'error' | 'info';
  title: string;
  message: string;
  version?: string;
}
export function Spinner() { return <span className="fusion-spinner" aria-hidden="true" />; }

export default function AdminFeedback({ feedback, dismiss }: { feedback: Feedback | null; dismiss: (id: number) => void }) {
  useEffect(() => {
    if (!feedback || !['success', 'info'].includes(feedback.phase)) return;
    const timer = setTimeout(() => dismiss(feedback.id), 9000);
    return () => clearTimeout(timer);
  }, [feedback?.id, dismiss]);
  return <div className="fusion-toast-region" aria-label="Notificaciones" aria-live="polite" aria-atomic="true">
    {feedback && <div className="fusion-toast" data-phase={feedback.phase} role="status">
      <span className="fusion-toast-icon" aria-hidden="true">{['saving', 'waiting'].includes(feedback.phase) ? <Spinner /> : feedback.phase === 'success' ? '✓' : feedback.phase === 'error' ? '!' : 'i'}</span>
      <div><strong>{feedback.title}</strong><p>{feedback.message}</p></div>
      {feedback.phase !== 'saving' && <button type="button" aria-label="Cerrar notificación" onClick={() => dismiss(feedback.id)}>×</button>}
    </div>}
  </div>;
}
