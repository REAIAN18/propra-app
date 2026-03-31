'use client';

import { useState, useEffect } from 'react';
import ResponseTrackingModal, { ResponseData } from '@/components/dealscope/ResponseTrackingModal';

interface Property {
  id: string;
  propertyId: string;
  name: string;
  owner: string;
  score: number;
  scoreLevel: string;
  lastAction: string;
}

interface PipelineEntry {
  id: string;
  propertyId: string;
  userId: string;
  stage: string;
  addedAt: string;
  updatedAt: string;
}

interface PipelineStage {
  name: string;
  id: string;
  stageValue: string;
  properties: Property[];
}

const STAGES = [
  { name: 'Identified', id: 'identified', stageValue: 'identified' },
  { name: 'Researched', id: 'researched', stageValue: 'researched' },
  { name: 'Approached', id: 'approached', stageValue: 'approached' },
  { name: 'In Negotiation', id: 'in-negotiation', stageValue: 'in_negotiation' },
  { name: 'Under Offer', id: 'under-offer', stageValue: 'under_offer' },
  { name: 'Completing', id: 'completing', stageValue: 'completing' },
];

// Demo data
const DEMO_PROPERTIES: Record<string, Property[]> = {
  identified: [
    {
      id: '1',
      propertyId: 'meridian-roch',
      name: 'Meridian Business Park',
      owner: 'Meridian Holdings',
      score: 92,
      scoreLevel: 'hot',
      lastAction: '1h ago',
    },
    {
      id: '2',
      propertyId: 'redfield-manor',
      name: 'Redfield Manor',
      owner: 'Redfield Estates',
      score: 86,
      scoreLevel: 'hot',
      lastAction: '3h ago',
    },
    {
      id: '3',
      propertyId: 'vale-trading',
      name: 'Vale Trading Estate',
      owner: 'Vale Properties',
      score: 78,
      scoreLevel: 'warm',
      lastAction: '5h ago',
    },
  ],
  researched: [
    {
      id: '4',
      propertyId: 'industrial-manchester',
      name: 'Industrial Unit Manchester',
      owner: 'Manchester Holdings',
      score: 72,
      scoreLevel: 'warm',
      lastAction: '1 day ago',
    },
  ],
  approached: [],
  in_negotiation: [],
  under_offer: [],
  completing: [],
};

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>(
    STAGES.map((s) => ({ ...s, properties: [] }))
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ propertyId: string; fromStage: string } | null>(null);

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        const response = await fetch('/api/dealscope/pipeline');
        const data = await response.json();

        if (data.isDemo || !data.entries || data.entries.length === 0) {
          // Use demo data
          const demoStages = STAGES.map((s) => ({
            ...s,
            properties: DEMO_PROPERTIES[s.stageValue as keyof typeof DEMO_PROPERTIES] || [],
          }));
          setStages(demoStages);
        } else {
          // Load real data from pipeline entries
          // Group properties by stage
          const propertiesByStage: Record<string, Property[]> = {};
          STAGES.forEach((s) => {
            propertiesByStage[s.stageValue] = [];
          });

          (data.entries as PipelineEntry[]).forEach((entry) => {
            // Find property in demo data to get additional info
            const demoProps = Object.values(DEMO_PROPERTIES).flat();
            const prop = demoProps.find((p) => p.propertyId === entry.propertyId);

            if (prop) {
              const stageKey = entry.stage as keyof typeof propertiesByStage;
              if (propertiesByStage[stageKey]) {
                propertiesByStage[stageKey].push(prop);
              }
            }
          });

          const loadedStages = STAGES.map((s) => ({
            ...s,
            properties: propertiesByStage[s.stageValue] || [],
          }));
          setStages(loadedStages);
        }
      } catch (error) {
        console.error('Error loading pipeline:', error);
        // Fallback to demo data
        const demoStages = STAGES.map((s) => ({
          ...s,
          properties: DEMO_PROPERTIES[s.stageValue as keyof typeof DEMO_PROPERTIES] || [],
        }));
        setStages(demoStages);
      }
    };

    loadPipeline();
  }, []);

  const handleOpenModal = (property: Property) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProperty(null);
  };

  const handleSaveResponse = async (data: ResponseData) => {
    if (!selectedProperty) return;

    try {
      const response = await fetch('/api/dealscope/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedProperty.propertyId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save response');
      }

      console.log('Response saved successfully');
      handleCloseModal();
    } catch (error) {
      console.error('Error saving response:', error);
      throw error;
    }
  };

  const handleDragStart = (property: Property, stageId: string) => {
    setDraggedItem({ propertyId: property.propertyId, fromStage: stageId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (toStageId: string) => {
    if (!draggedItem) return;
    if (draggedItem.fromStage === toStageId) {
      setDraggedItem(null);
      return;
    }

    const toStage = STAGES.find((s) => s.id === toStageId);
    if (!toStage) return;

    try {
      const response = await fetch('/api/dealscope/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: draggedItem.propertyId,
          stage: toStage.stageValue,
        }),
      });

      if (response.ok) {
        setStages((prevStages) =>
          prevStages.map((stage) => {
            if (stage.id === draggedItem.fromStage) {
              return {
                ...stage,
                properties: stage.properties.filter(
                  (p) => p.propertyId !== draggedItem.propertyId
                ),
              };
            }
            if (stage.id === toStageId) {
              const movedProp = stages
                .find((s) => s.id === draggedItem.fromStage)
                ?.properties.find((p) => p.propertyId === draggedItem.propertyId);
              if (movedProp) {
                return {
                  ...stage,
                  properties: [...stage.properties, movedProp],
                };
              }
            }
            return stage;
          })
        );
      }
    } catch (error) {
      console.error('Error updating pipeline:', error);
    } finally {
      setDraggedItem(null);
    }
  };

  const getAnalytics = () => {
    const totalDeals = stages.reduce((sum, s) => sum + s.properties.length, 0);
    const inNegotiation =
      stages.find((s) => s.id === 'in-negotiation')?.properties.length || 0;
    const avgScore =
      totalDeals > 0
        ? (
            stages.reduce(
              (sum, s) =>
                sum + s.properties.reduce((pSum, p) => pSum + p.score, 0),
              0
            ) / totalDeals
          ).toFixed(1)
        : '0';

    return { totalDeals, inNegotiation, avgScore };
  };

  const analytics = getAnalytics();

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)]">
      <ResponseTrackingModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveResponse}
        propertyName={selectedProperty?.name}
        propertyId={selectedProperty?.propertyId}
      />

      {/* Header with Analytics */}
      <div className="bg-[var(--s1)] border-b border-[var(--s2)] px-6 py-4">
        <h1 className="text-2xl font-semibold text-[var(--tx)]">Pipeline</h1>
        <p className="text-sm text-[var(--tx2)] mt-1">Manage deals across stages</p>
        <div className="flex gap-8 mt-4">
          <div>
            <div className="text-2xl font-bold text-[var(--tx)]">{analytics.totalDeals}</div>
            <div className="text-xs text-[var(--tx2)]">Total Deals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--acc)]">{analytics.inNegotiation}</div>
            <div className="text-xs text-[var(--tx2)]">In Negotiation</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--tx)]">{analytics.avgScore}</div>
            <div className="text-xs text-[var(--tx2)]">Avg Deal Score</div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto bg-[var(--s2)] p-6">
        <div className="flex gap-6 min-w-min">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 bg-[var(--s3)] rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column header */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[var(--tx)] mb-2">{stage.name}</h2>
                <div className="text-xs text-[var(--tx2)] bg-[var(--s1)] rounded px-2 py-1 inline-block">
                  {stage.properties.length} deal{stage.properties.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-96">
                {stage.properties.map((prop) => (
                  <div
                    key={prop.id}
                    draggable
                    onDragStart={() => handleDragStart(prop, stage.id)}
                    className={`bg-[var(--s1)] rounded-lg p-4 border border-[var(--s3)] hover:border-[var(--acc)] transition-colors cursor-move ${draggedItem?.propertyId === prop.propertyId ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-semibold text-[var(--tx)] flex-1">{prop.name}</h3>
                      <div
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          prop.scoreLevel === 'hot'
                            ? 'bg-[var(--grn)]/20 text-[var(--grn)]'
                            : prop.scoreLevel === 'warm'
                              ? 'bg-[var(--amb)]/20 text-[var(--amb)]'
                              : 'bg-[var(--blu)]/20 text-[var(--blu)]'
                        }`}
                      >
                        {prop.score}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--tx2)] mb-3">{prop.owner}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--s3)] mb-3">
                      <span className="text-xs text-[var(--tx2)]">Last action</span>
                      <span className="text-xs text-[var(--tx)]">{prop.lastAction}</span>
                    </div>
                    <button
                      onClick={() => handleOpenModal(prop)}
                      className="w-full px-3 py-2 bg-[var(--acc)] text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                      Track Response
                    </button>
                  </div>
                ))}

                {/* Empty column indicator */}
                {stage.properties.length === 0 && (
                  <div className="flex items-center justify-center min-h-96 text-center">
                    <p className="text-xs text-[var(--tx2)]">No deals in this stage</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
