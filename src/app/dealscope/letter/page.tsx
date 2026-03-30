'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type Tone = 'formal' | 'direct' | 'consultative';

export default function ApproachLetterPage() {
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [tone, setTone] = useState<Tone>('formal');
  const [letter, setLetter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [letterId, setLetterId] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMethod, setSendMethod] = useState<'email' | 'post'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Mock property data - in production, this would come from the deal API
  const propertyData = {
    address: '179 Harrow Road, London W2 6NB',
    ownerName: 'HarbourView Properties Ltd',
    ownerCompany: 'HarbourView Properties Ltd',
    propertyType: 'Office',
    valuation: 12500000,
    opportunityThesis:
      'Grade II* heritage office in Paddington. Strong location with excellent transport links. Current tenant stable with 6.2 years remaining on lease. Opportunity for owner-occupation or hold-as-is investment strategy.',
  };

  const generateLetter = async (selectedTone: Tone) => {
    if (!dealId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/dealscope/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          tone: selectedTone,
          propertyAddress: propertyData.address,
          ownerName: propertyData.ownerName,
          ownerCompany: propertyData.ownerCompany,
          propertyType: propertyData.propertyType,
          valuation: propertyData.valuation,
          opportunityThesis: propertyData.opportunityThesis,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLetter(data.content);
        setLetterId(data.letterId);
        setEditedContent(data.content);
      }
    } catch (error) {
      console.error('Error generating letter:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      generateLetter(tone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
    generateLetter(newTone);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSaveEdit = () => {
    setLetter(editedContent);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(letter);
    setEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      alert('Letter copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleSend = async () => {
    if (!letterId) return;

    setSending(true);
    try {
      const response = await fetch('/api/dealscope/letter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letterId,
          method: sendMethod,
          recipientEmail: sendMethod === 'email' ? recipientEmail : undefined,
          recipientAddress: sendMethod === 'post' ? recipientAddress : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Letter sent via ${sendMethod}!`);
        setShowSendModal(false);
      } else {
        alert(`Failed to send: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending letter:', error);
      alert('Failed to send letter');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg, #09090b)', minHeight: '100vh', color: 'var(--tx, #e4e4ec)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Approach Letter Generator</h1>
          <p style={{ color: 'var(--tx, #a1a1aa)' }}>Generate personalized approach letters for property owners</p>
        </div>

        {/* Property Context */}
        <div
          style={{
            background: 'var(--s1, #111116)',
            border: '1px solid var(--s2, #18181f)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Property Context</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx, #a1a1aa)', marginBottom: '0.25rem' }}>Address</div>
              <div>{propertyData.address}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx, #a1a1aa)', marginBottom: '0.25rem' }}>Owner</div>
              <div>{propertyData.ownerName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx, #a1a1aa)', marginBottom: '0.25rem' }}>Type</div>
              <div>{propertyData.propertyType}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx, #a1a1aa)', marginBottom: '0.25rem' }}>
                Valuation
              </div>
              <div>£{(propertyData.valuation / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </div>

        {/* Tone Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Select Tone</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {(['formal', 'direct', 'consultative'] as Tone[]).map((t) => (
              <label
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.75rem 1rem',
                  background: tone === t ? 'var(--acc, #7c6af0)' : 'var(--s1, #111116)',
                  border: '1px solid var(--s2, #18181f)',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="tone"
                  value={t}
                  checked={tone === t}
                  onChange={() => handleToneChange(t)}
                  style={{ accentColor: 'var(--acc, #7c6af0)' }}
                />
                <span style={{ textTransform: 'capitalize' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Letter Preview */}
        <div
          style={{
            background: 'var(--s1, #111116)',
            border: '1px solid var(--s2, #18181f)',
            borderRadius: '8px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Letter Preview</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--tx, #a1a1aa)' }}>
              Generating letter...
            </div>
          ) : editing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '1rem',
                background: 'var(--bg, #09090b)',
                border: '1px solid var(--s2, #18181f)',
                borderRadius: '4px',
                color: 'var(--tx, #e4e4ec)',
                fontFamily: 'Georgia, serif',
                fontSize: '1rem',
                lineHeight: '1.7',
                resize: 'vertical',
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1rem',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
              }}
            >
              {letter || 'No letter generated yet. Select a tone to generate.'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--acc, #7c6af0)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--s1, #111116)',
                  color: 'var(--tx, #e4e4ec)',
                  border: '1px solid var(--s2, #18181f)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                disabled={!letter}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--acc, #7c6af0)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: letter ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  opacity: letter ? 1 : 0.5,
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                disabled={!letter}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--grn, #34d399)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: letter ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  opacity: letter ? 1 : 0.5,
                }}
              >
                Send
              </button>
              <button
                onClick={handleCopy}
                disabled={!letter}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--s1, #111116)',
                  color: 'var(--tx, #e4e4ec)',
                  border: '1px solid var(--s2, #18181f)',
                  borderRadius: '8px',
                  cursor: letter ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  opacity: letter ? 1 : 0.5,
                }}
              >
                Copy
              </button>
            </>
          )}
        </div>

        {/* Send Modal */}
        {showSendModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowSendModal(false)}
          >
            <div
              style={{
                background: 'var(--s1, #111116)',
                border: '1px solid var(--s2, #18181f)',
                borderRadius: '8px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>Send Letter</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--tx, #a1a1aa)', marginBottom: '0.5rem' }}>
                  Method
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sendMethod"
                      value="email"
                      checked={sendMethod === 'email'}
                      onChange={() => setSendMethod('email')}
                      style={{ accentColor: 'var(--acc, #7c6af0)' }}
                    />
                    Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sendMethod"
                      value="post"
                      checked={sendMethod === 'post'}
                      onChange={() => setSendMethod('post')}
                      style={{ accentColor: 'var(--acc, #7c6af0)' }}
                    />
                    Post
                  </label>
                </div>
              </div>

              {sendMethod === 'email' ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="owner@example.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'var(--bg, #09090b)',
                      border: '1px solid var(--s2, #18181f)',
                      borderRadius: '4px',
                      color: 'var(--tx, #e4e4ec)',
                    }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Mailing Address
                  </label>
                  <textarea
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="123 Main St&#10;London W1A 1AA"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'var(--bg, #09090b)',
                      border: '1px solid var(--s2, #18181f)',
                      borderRadius: '4px',
                      color: 'var(--tx, #e4e4ec)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSend}
                  disabled={
                    sending || (sendMethod === 'email' && !recipientEmail) || (sendMethod === 'post' && !recipientAddress)
                  }
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: 'var(--acc, #7c6af0)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    opacity: sending ? 0.5 : 1,
                  }}
                >
                  {sending ? 'Sending...' : `Send via ${sendMethod}`}
                </button>
                <button
                  onClick={() => setShowSendModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--s1, #111116)',
                    color: 'var(--tx, #e4e4ec)',
                    border: '1px solid var(--s2, #18181f)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
