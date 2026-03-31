import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Demo data - returns scored properties for the heatmap
  const properties = [
    {
      id: 'meridian-roch',
      address: 'Unit 7, Rochester, Kent ME2 4LR',
      assetType: 'industrial',
      dealScore: 92,
      temperature: 'hot' as const,
      signals: ['valuation-increase', 'owner-distress'],
    },
    {
      id: 'industrial-manchester',
      address: 'Manchester, Greater Manchester',
      assetType: 'industrial',
      dealScore: 78,
      temperature: 'warm' as const,
      signals: ['owner-financial-stress'],
    },
    {
      id: 'retail-birmingham',
      address: 'Birmingham, West Midlands',
      assetType: 'retail',
      dealScore: 65,
      temperature: 'watch' as const,
      signals: ['planning-application'],
    },
  ];

  return NextResponse.json(properties);
}
