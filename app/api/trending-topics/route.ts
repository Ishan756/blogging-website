import { NextRequest, NextResponse } from 'next/server';
import { fetchAllTrendingTopics } from '@/lib/trending-scraper';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching trending topics from all sources...');
    const trends = await fetchAllTrendingTopics();
    
    return NextResponse.json({ 
      trends: trends.map(trend => ({
        title: trend.title,
        source: trend.source,
        searchVolume: trend.searchVolume,
        relatedQueries: trend.relatedQueries,
        category: trend.category,
        timestamp: trend.timestamp,
        thumbnail: trend.thumbnail,
        description: trend.description,
        url: trend.url,
        engagement: trend.engagement
      }))
    });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}