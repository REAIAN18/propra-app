'use client';

import { useState } from 'react';
import styles from './ResponseTrackingModal.module.css';

interface ResponseTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResponseData) => Promise<void>;
  propertyName?: string;
  daysAgoApproached?: number;
  propertyId?: string;
}

export interface ResponseData {
  status: 'interested' | 'not_interested' | 'maybe' | 'no_response';
  followUpDate?: string;
  note?: string;
}

const statusOptions = [
  { value: 'interested', emoji: '👍', label: 'Interested', description: 'Wants to discuss further', color: 'grn' },
  { value: 'not_interested', emoji: '👎', label: 'Not interested', description: 'Deal closed', color: 'red' },
  { value: 'maybe', emoji: '🤔', label: 'Maybe / later', description: 'Needs time or conditions', color: 'amb' },
  { value: 'no_response', emoji: '📭', label: 'No response', description: 'No reply received', color: 'gray' },
];

export default function ResponseTrackingModal({
  isOpen,
  onClose,
  onSave,
  propertyName = 'Property',
  daysAgoApproached = 0,
  propertyId,
}: ResponseTrackingModalProps) {
  const [status, setStatus] = useState<ResponseData['status']>('no_response');
  const [followUpDate, setFollowUpDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        status,
        followUpDate: followUpDate || undefined,
        note: note || undefined,
      });
      // Reset form
      setStatus('no_response');
      setFollowUpDate('');
      setNote('');
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
          <div>
            <h2 className={styles.title}>Log response</h2>
            <p className={styles.subtitle}>
              {propertyName} {daysAgoApproached > 0 ? `— approached ${daysAgoApproached} ${daysAgoApproached === 1 ? 'day' : 'days'} ago` : ''}
            </p>
          </div>
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
          <div className={styles.formGroup}>
            <label className={styles.label}>What did they say?</label>
            <div className={styles.statusGrid}>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.statusButton} ${styles[`status-${option.color}`]} ${status === option.value ? styles.selected : ''}`}
                  onClick={() => setStatus(option.value as ResponseData['status'])}
                  disabled={saving}
                  type="button"
                >
                  <div className={styles.statusEmoji}>{option.emoji}</div>
                  <div className={styles.statusLabel}>{option.label}</div>
                  <div className={styles.statusDesc}>{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="note" className={styles.label}>Notes</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.textarea}
              placeholder="Any details from the conversation…"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Next action</label>
            <div className={styles.nextActionRow}>
              <span className={styles.nextActionLabel}>Follow up on:</span>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={styles.dateInput}
                disabled={saving}
              />
              <span className={styles.orLabel}>or</span>
              <button
                className={styles.moveBtn}
                disabled={saving}
                type="button"
              >
                Move to Negotiating
              </button>
            </div>
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
            {saving ? 'Saving...' : 'Save response'}
          </button>
        </div>
      </div>
    </div>
  );
}
