import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Demo data - returns scored properties for the heatmap
  const properties = [
    {
      id: 'meridian-roch',
      name: 'Meridian Business Park',
      address: 'Unit 7, Rochester, Kent ME2 4LR',
      type: 'industrial',
      score: 92,
      scoreLevel: 'hot',
      lat: 51.3811,
      lng: 0.5038,
      value: '£700k-£820k',
      owner: 'Meridian Property Holdings Ltd',
      signals: ['valuation-increase', 'owner-distress'],
    },
    {
      id: 'industrial-manchester',
      name: 'Industrial Unit',
      address: 'Manchester, Greater Manchester',
      type: 'industrial',
      score: 78,
      scoreLevel: 'warm',
      lat: 53.4808,
      lng: -2.2426,
      value: '£450k-£550k',
      owner: 'Manchester Holdings',
      signals: ['owner-financial-stress'],
    },
    {
      id: 'retail-birmingham',
      name: 'Retail Space',
      address: 'Birmingham, West Midlands',
      type: 'retail',
      score: 65,
      scoreLevel: 'watch',
      lat: 52.5086,
      lng: -1.8855,
      value: '£300k-£400k',
      owner: 'Retail Ventures Ltd',
      signals: ['planning-application'],
    },
  ];

  return NextResponse.json({
    properties,
    total: properties.length,
  });
}
