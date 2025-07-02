import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Article from '@/models/Article';
import { 
  fetchAllTrendingTopics, 
  enrichTopicWithMedia, 
  generateSlug 
} from '@/lib/trending-scraper';
import { generateArticleFromTrend, generateEnhancedArticle } from '@/lib/enhanced-openai';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { topic, source } = await request.json();
    let selectedTopic = topic;
    // Only allow the types that your Article schema expects
    let trendingSource: 'google' | 'twitter' | 'manual' = 'manual';
    
    // If no topic provided, get trending topics
    if (!selectedTopic) {
      console.log('Fetching trending topics...');
      const trends = await fetchAllTrendingTopics();
      
      if (trends.length > 0) {
        // Select a random trending topic
        const randomIndex = Math.floor(Math.random() * Math.min(trends.length, 10));
        const selectedTrend = trends[randomIndex];
        selectedTopic = selectedTrend.title;

        // Map source to allowed types
        if (selectedTrend.source === 'google' || selectedTrend.source === 'twitter') {
          trendingSource = selectedTrend.source;
        } else {
          trendingSource = 'manual';
        }
        
        console.log(`Selected trending topic: ${selectedTopic} from ${trendingSource}`);
      } else {
        selectedTopic = 'Latest Technology Trends and Innovations';
        trendingSource = 'manual';
      }
    }

    // Check if article with this topic already exists
    const existingSlug = generateSlug(selectedTopic);
    const existingArticle = await Article.findOne({ slug: existingSlug });
    if (existingArticle) {
      return NextResponse.json(
        { error: 'Article with this topic already exists' },
        { status: 409 }
      );
    }

    console.log('Enriching topic with media and related content...');
    
    // Create enriched topic data
    const enrichedTopic = await enrichTopicWithMedia({
      title: selectedTopic,
      source: trendingSource,
      relatedQueries: [],
      timestamp: new Date()
    });

    console.log('Generating article with AI...');
    
    // Generate article using enhanced OpenAI integration
    const generatedContent = await generateArticleFromTrend(enrichedTopic);

    const slug = generateSlug(generatedContent.title);
    
    console.log('Saving article to database...');
    
    // Create new article with enhanced data
    const article = new Article({
      title: generatedContent.title,
      slug,
      content: generatedContent.content,
      excerpt: generatedContent.excerpt,
      featuredImage: generatedContent.featuredImage,
      metaTitle: generatedContent.metaTitle,
      metaDescription: generatedContent.metaDescription,
      ogTitle: generatedContent.ogTitle,
      ogDescription: generatedContent.ogDescription,
      ogImage: generatedContent.featuredImage,
      tags: generatedContent.tags,
      trendingTopic: selectedTopic,
      trendingSource,
      media: generatedContent.media,
      structuredData: generatedContent.structuredData,
      relatedArticles: enrichedTopic.relatedArticles,
    });

    await article.save();

    console.log('Article generated successfully:', article.title);

    return NextResponse.json({ 
      success: true, 
      article: {
        id: article._id,
        title: article.title,
        slug: article.slug,
        trendingSource: article.trendingSource,
        mediaCount: {
          images: article.media.images.length,
          videos: article.media.videos.length,
          tweets: article.media.tweets.length
        }
      }
    });
  } catch (error) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article. Please try again.' },
      { status: 500 }
    );
  }
}

// Get trending topics for preview
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('Fetching current trending topics...');
    const trends = await fetchAllTrendingTopics();
    
    return NextResponse.json({ 
      trends: trends.slice(0, 10).map(trend => ({
        title: trend.title,
        source: trend.source,
        searchVolume: trend.searchVolume,
        relatedQueries: trend.relatedQueries.slice(0, 3)
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