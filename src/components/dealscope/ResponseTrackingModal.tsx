'use client';

import { useState } from 'react';
import styles from './ResponseTrackingModal.module.css';

interface ResponseTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResponseData) => Promise<void>;
  propertyName?: string;
}

export interface ResponseData {
  status: 'interested' | 'not_interested' | 'maybe' | 'no_response';
  followUpDate?: string;
  notes?: string;
}

export default function ResponseTrackingModal({
  isOpen,
  onClose,
  onSave,
  propertyName = 'Property',
}: ResponseTrackingModalProps) {
  const [status, setStatus] = useState<ResponseData['status']>('no_response');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        status,
        followUpDate: followUpDate || undefined,
        notes,
      });
      // Reset form
      setStatus('no_response');
      setFollowUpDate('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Failed to save response:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Track Response</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>
            Recording response for <strong>{propertyName}</strong>
          </p>

          <div className={styles.formGroup}>
            <label htmlFor="status" className={styles.label}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ResponseData['status'])}
              className={styles.select}
              disabled={saving}
            >
              <option value="no_response">No Response</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="maybe">Maybe/Undecided</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="followUpDate" className={styles.label}>
              Follow-up Date
            </label>
            <input
              id="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={styles.input}
              disabled={saving}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.label}>
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              placeholder="Add any notes about this response..."
              rows={4}
              disabled={saving}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Response'}
          </button>
        </div>
      </div>
    </div>
  );
}
