'use client';

import { useState, useEffect } from 'react';

interface Property {
  id: string;
  name: string;
  owner: string;
  score: number;
  scoreLevel: string;
  lastAction: string;
}

interface PipelineStage {
  name: string;
  id: string;
  properties: Property[];
}

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([
    { name: 'Identified', id: 'identified', properties: [] },
    { name: 'Researched', id: 'researched', properties: [] },
    { name: 'Approached', id: 'approached', properties: [] },
    { name: 'Negotiating', id: 'negotiating', properties: [] },
    { name: 'Under Offer', id: 'under-offer', properties: [] },
    { name: 'Completing', id: 'completing', properties: [] },
  ]);

  useEffect(() => {
    // Load demo data
    setStages((prev) => [
      {
        ...prev[0],
        properties: [
          {
            id: '1',
            name: 'Meridian Business Park',
            owner: 'Meridian Holdings',
            score: 92,
            scoreLevel: 'hot',
            lastAction: '2 hours ago',
          },
          {
            id: '2',
            name: 'Industrial Unit Manchester',
            owner: 'Manchester Holdings',
            score: 78,
            scoreLevel: 'warm',
            lastAction: '5 hours ago',
          },
        ],
      },
      {
        ...prev[1],
        properties: [
          {
            id: '3',
            name: 'Retail Space Birmingham',
            owner: 'Retail Ventures',
            score: 65,
            scoreLevel: 'watch',
            lastAction: '1 day ago',
          },
        ],
      },
      ...prev.slice(2),
    ]);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--s1)] border-b border-[var(--s2)] px-6 py-4">
        <h1 className="text-2xl font-semibold text-[var(--tx)]">Pipeline</h1>
        <p className="text-sm text-[var(--tx-secondary)] mt-1">Manage deals across stages</p>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto bg-[var(--s2)] p-6">
        <div className="flex gap-6 min-w-min">
          {stages.map((stage) => (
            <div key={stage.id} className="w-80 flex-shrink-0">
              {/* Column header */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[var(--tx)] mb-2">{stage.name}</h2>
                <div className="text-xs text-[var(--tx-secondary)] bg-[var(--s3)] rounded px-2 py-1 inline-block">
                  {stage.properties.length} deal{stage.properties.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-96">
                {stage.properties.map((prop) => (
                  <div
                    key={prop.id}
                    className="bg-[var(--s1)] rounded-lg p-4 border border-[var(--s3)] hover:border-[var(--acc)] transition-colors cursor-move"
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
                    <p className="text-xs text-[var(--tx-secondary)] mb-3">{prop.owner}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--s3)]">
                      <span className="text-xs text-[var(--tx-secondary)]">Last action</span>
                      <span className="text-xs text-[var(--tx)]">{prop.lastAction}</span>
                    </div>
                  </div>
                ))}

                {/* Empty column indicator */}
                {stage.properties.length === 0 && (
                  <div className="flex items-center justify-center min-h-96 text-center">
                    <p className="text-xs text-[var(--tx-secondary)]">No deals in this stage</p>
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
