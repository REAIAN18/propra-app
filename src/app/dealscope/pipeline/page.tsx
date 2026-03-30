'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { id: 'identified', label: 'Identified' },
  { id: 'quick_review', label: 'Quick Review' },
  { id: 'full_analysis', label: 'Full Analysis' },
  { id: 'approached', label: 'Approached' },
  { id: 'in_negotiation', label: 'In Negotiation' },
];

type Deal = {
  id: string;
  address: string;
  postcode: string;
  assetType: string;
  askingPrice?: number;
  guidePrice?: number;
  signalCount: number;
  pipelineStage: string;
  latestApproachLetter?: {
    responseStatus?: string;
    followUpDate?: string;
    notes?: string;
  } | null;
};

type PipelineData = Record<string, Deal[]>;

type Analytics = {
  pipelineValue: number;
  successRate: number;
  avgTimeToNegotiation: number;
  totalDeals: number;
};

export default function PipelinePage() {
  const router = useRouter();
  const [deals, setDeals] = useState<PipelineData>({});
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [responseForm, setResponseForm] = useState({
    responseStatus: '',
    followUpDate: '',
    notes: '',
  });
  const [savingResponse, setSavingResponse] = useState(false);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const response = await fetch('/api/dealscope/pipeline');
      const data = await response.json();
      setDeals(data.deals || {});
      setAnalytics(data.analytics || null);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggingDealId) return;

    // Find the deal
    let deal: Deal | null = null;
    for (const stage of Object.keys(deals)) {
      const found = deals[stage].find((d) => d.id === draggingDealId);
      if (found) {
        deal = found;
        break;
      }
    }

    if (!deal || deal.pipelineStage === targetStage) {
      setDraggingDealId(null);
      return;
    }

    // Optimistically update UI
    const newDeals = { ...deals };
    newDeals[deal.pipelineStage] = newDeals[deal.pipelineStage].filter((d) => d.id !== draggingDealId);
    newDeals[targetStage] = [...newDeals[targetStage], { ...deal, pipelineStage: targetStage }];
    setDeals(newDeals);
    setDraggingDealId(null);

    // Update on server
    try {
      await fetch('/api/dealscope/pipeline/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: draggingDealId, stage: targetStage }),
      });
      fetchPipeline(); // Refresh to get updated analytics
    } catch (error) {
      console.error('Error updating stage:', error);
      // Revert on error
      fetchPipeline();
    }
  };

  const handleCardClick = (deal: Deal) => {
    if (deal.pipelineStage === 'approached' || deal.pipelineStage === 'in_negotiation') {
      // Show response tracking modal
      setSelectedDeal(deal);
      setResponseForm({
        responseStatus: deal.latestApproachLetter?.responseStatus || '',
        followUpDate: deal.latestApproachLetter?.followUpDate?.split('T')[0] || '',
        notes: deal.latestApproachLetter?.notes || '',
      });
      setShowResponseModal(true);
    } else {
      // Navigate to full dossier (placeholder - will be implemented in PRO-820)
      router.push(`/dealscope/dossier?dealId=${deal.id}`);
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedDeal) return;

    setSavingResponse(true);
    try {
      await fetch('/api/dealscope/pipeline/track-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          ...responseForm,
        }),
      });
      setShowResponseModal(false);
      fetchPipeline();
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Failed to save response');
    } finally {
      setSavingResponse(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '2rem', color: 'var(--tx)' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto' }}>Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--tx)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--s2)', padding: '2rem' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem' }}>Deal Pipeline</h1>

          {/* Analytics Bar */}
          {analytics && (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                  Pipeline Value
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                  £{(analytics.pipelineValue / 1000000).toFixed(1)}M
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Success Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{analytics.successRate}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                  Avg Time to Negotiation
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{analytics.avgTimeToNegotiation} days</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Total Deals</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{analytics.totalDeals}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '1.5rem',
            }}
          >
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                style={{
                  background: 'var(--s1)',
                  border: '1px solid var(--s2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  minHeight: '600px',
                }}
              >
                {/* Column Header */}
                <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--s2)' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{stage.label}</div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>
                    {deals[stage.id]?.length || 0} deals
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(deals[stage.id] || []).map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => handleCardClick(deal)}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--s2)',
                        borderRadius: '6px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--acc)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--s2)';
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {deal.address}
                      </div>
                      {deal.postcode && (
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>
                          {deal.postcode}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{deal.assetType}</span>
                        {/* Signal dots */}
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {Array.from({ length: deal.signalCount }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--acc)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      {(deal.askingPrice || deal.guidePrice) && (
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--grn)' }}>
                          £{((deal.askingPrice || deal.guidePrice || 0) / 1000000).toFixed(2)}M
                        </div>
                      )}
                      {deal.latestApproachLetter?.responseStatus && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background: 'var(--s1)',
                            borderRadius: '4px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {deal.latestApproachLetter.responseStatus.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Response Tracking Modal */}
      {showResponseModal && selectedDeal && (
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
          onClick={() => setShowResponseModal(false)}
        >
          <div
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--s2)',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              Track Response
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
              {selectedDeal.address}
            </div>

            {/* Status Dropdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                Response Status
              </label>
              <select
                value={responseForm.responseStatus}
                onChange={(e) => setResponseForm({ ...responseForm, responseStatus: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--s2)',
                  borderRadius: '4px',
                  color: 'var(--tx)',
                }}
              >
                <option value="">Select status</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="maybe">Maybe</option>
                <option value="no_response">No Response</option>
              </select>
            </div>

            {/* Follow-up Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                Follow-up Date
              </label>
              <input
                type="date"
                value={responseForm.followUpDate}
                onChange={(e) => setResponseForm({ ...responseForm, followUpDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--s2)',
                  borderRadius: '4px',
                  color: 'var(--tx)',
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                Notes
              </label>
              <textarea
                value={responseForm.notes}
                onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--s2)',
                  borderRadius: '4px',
                  color: 'var(--tx)',
                  resize: 'vertical',
                }}
                placeholder="Add any notes about this interaction..."
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveResponse}
                disabled={savingResponse}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: 'var(--acc)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: savingResponse ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: savingResponse ? 0.5 : 1,
                }}
              >
                {savingResponse ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowResponseModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg)',
                  color: 'var(--tx)',
                  border: '1px solid var(--s2)',
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
  );
}
