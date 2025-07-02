import puppeteer from 'puppeteer';
// import * as cheerio from 'cheerio';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

const cheerio = require('cheerio');
export interface TrendingTopic {
  title: string;
  source: 'google' | 'twitter' | 'youtube' | 'manual';
  searchVolume?: string;
  relatedQueries: string[];
  category?: string;
  location?: string;
  timestamp: Date;
  thumbnail?: string;
  description?: string;
  url?: string;
  engagement?: {
    views?: string;
    likes?: string;
    comments?: string;
  };
}

export interface MediaContent {
  images: Array<{
    url: string;
    alt: string;
    source: string;
    width?: number;
    height?: number;
  }>;
  videos: Array<{
    url: string;
    title: string;
    thumbnail: string;
    duration?: string;
    source: 'youtube' | 'other';
    description?: string;
    channelName?: string;
  }>;
  tweets: Array<{
    id: string;
    text: string;
    author: string;
    url: string;
    embedCode: string;
    metrics?: {
      likes: number;
      retweets: number;
      replies: number;
    };
  }>;
}

export interface EnrichedTopic {
  topic: TrendingTopic;
  media: MediaContent;
  relatedArticles: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }>;
}

// YouTube Trending Topics
export async function fetchYouTubeTrending(): Promise<TrendingTopic[]> {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('YouTube API key not provided, skipping YouTube trends');
      return [];
    }

    // Fetch trending videos from YouTube
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode: 'US',
        maxResults: 15,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    const youtubeTopics: TrendingTopic[] = response.data.items.map((video: any) => ({
      title: video.snippet.title,
      source: 'youtube' as const,
      description: video.snippet.description?.substring(0, 200) + '...',
      thumbnail: video.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      relatedQueries: video.snippet.tags?.slice(0, 5) || [],
      category: video.snippet.categoryId,
      timestamp: new Date(),
      engagement: {
        views: parseInt(video.statistics.viewCount).toLocaleString(),
        likes: parseInt(video.statistics.likeCount || 0).toLocaleString(),
        comments: parseInt(video.statistics.commentCount || 0).toLocaleString()
      }
    }));

    return youtubeTopics;
  } catch (error) {
    console.error('Error fetching YouTube trends:', error);
    return [];
  }
}

// Twitter Trending Topics
export async function fetchTwitterTrends(): Promise<TrendingTopic[]> {
  try {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.log('Twitter Bearer Token not provided, skipping Twitter trends');
      return [];
    }

    const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    
    // Get trending topics for worldwide (WOEID: 1)
    const worldwideTrends = await twitterClient.v1.trends({ id: 1 });

    const twitterTopics: TrendingTopic[] = worldwideTrends[0].trends
      .filter(trend => trend.name && !trend.name.startsWith('#'))
      .slice(0, 15)
      .map(trend => ({
        title: trend.name,
        source: 'twitter' as const,
        searchVolume: trend.tweet_volume?.toString(),
        url: trend.url,
        relatedQueries: [],
        timestamp: new Date(),
      }));

    return twitterTopics;
  } catch (error) {
    console.error('Error fetching Twitter trends:', error);
    return [];
  }
}

// Google Trends Scraper
export async function scrapeGoogleTrends(): Promise<TrendingTopic[]> {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to Google Trends daily trends
    await page.goto('https://trends.google.com/trends/trendingsearches/daily', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForSelector('[data-module-name="FeedItem"]', { timeout: 10000 });

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const trends: TrendingTopic[] = [];

    // Extract trending topics
    $('[data-module-name="FeedItem"]').each((_, element) => {
      const titleElement = $(element).find('.mZ3RIc');
      const title = titleElement.text().trim();
      
      if (title) {
        // Extract search volume if available
        const searchVolumeElement = $(element).find('.P2Dfkf');
        const searchVolume = searchVolumeElement.text().trim();

        // Extract related queries
        const relatedQueries: string[] = [];
        $(element).find('.mZ3RIc').each((_, queryElement) => {
          const query = $(queryElement).text().trim();
          if (query && query !== title) {
            relatedQueries.push(query);
          }
        });

        trends.push({
          title,
          source: 'google',
          searchVolume: searchVolume || undefined,
          relatedQueries: relatedQueries.slice(0, 5),
          timestamp: new Date(),
        });
      }
    });

    return trends.slice(0, 15); // Return top 15 trends
  } catch (error) {
    console.error('Error scraping Google Trends:', error);
    return getFallbackTrends();
  }
}

// Search for related media content
export async function searchRelatedMedia(topic: string): Promise<MediaContent> {
  const media: MediaContent = {
    images: [],
    videos: [],
    tweets: []
  };

  try {
    // Search for images using Unsplash
    await searchUnsplashImages(topic, media);
    
    // Search for YouTube videos
    await searchYouTubeVideos(topic, media);
    
    // Search for related tweets
    await searchRelatedTweets(topic, media);
    
  } catch (error) {
    console.error('Error searching related media:', error);
  }

  return media;
}

// Search Unsplash for high-quality images
async function searchUnsplashImages(topic: string, media: MediaContent) {
  try {
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      // Fallback to curated stock images
      media.images.push({
        url: `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=400&fit=crop&crop=center&auto=format`,
        alt: `${topic} related image`,
        source: 'unsplash',
        width: 800,
        height: 400
      });
      return;
    }

    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query: topic,
        per_page: 5,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });

    response.data.results.forEach((photo: any) => {
      media.images.push({
        url: photo.urls.regular,
        alt: photo.alt_description || `${topic} related image`,
        source: 'unsplash',
        width: photo.width,
        height: photo.height
      });
    });
  } catch (error) {
    console.error('Error searching Unsplash images:', error);
    // Add fallback image
    media.images.push({
      url: `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=400&fit=crop&crop=center&auto=format`,
      alt: `${topic} related image`,
      source: 'unsplash',
      width: 800,
      height: 400
    });
  }
}

// Search YouTube for related videos
async function searchYouTubeVideos(topic: string, media: MediaContent) {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('YouTube API key not provided, skipping video search');
      return;
    }

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: topic,
        type: 'video',
        maxResults: 3,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    response.data.items.forEach((video: any) => {
      media.videos.push({
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        source: 'youtube',
        description: video.snippet.description,
        channelName: video.snippet.channelTitle
      });
    });
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
  }
}

// Search for related tweets
async function searchRelatedTweets(topic: string, media: MediaContent) {
  try {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.log('Twitter Bearer Token not provided, skipping tweet search');
      return;
    }

    const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    
    const tweets = await twitterClient.v2.search(topic, {
      max_results: 5,
      'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
      'user.fields': ['username', 'name'],
      expansions: ['author_id']
    });

    for (const tweet of tweets.data || []) {
      const author = tweets.includes?.users?.find(user => user.id === tweet.author_id);
      
      media.tweets.push({
        id: tweet.id,
        text: tweet.text,
        author: author?.username || 'Unknown',
        url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
        embedCode: `<blockquote class="twitter-tweet"><p>${tweet.text}</p><a href="https://twitter.com/${author?.username}/status/${tweet.id}"></a></blockquote>`,
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0
        }
      });
    }
  } catch (error) {
    console.error('Error searching related tweets:', error);
  }
}

// Search for related articles using web scraping
export async function searchRelatedArticles(topic: string): Promise<Array<{
  title: string;
  url: string;
  snippet: string;
  source: string;
}>> {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Search Google for related articles
    const searchQuery = encodeURIComponent(`${topic} news articles`);
    await page.goto(`https://www.google.com/search?q=${searchQuery}&tbm=nws`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const articles: Array<{
      title: string;
      url: string;
      snippet: string;
      source: string;
    }> = [];

    // Extract article information
    $('.SoaBEf').each((_, element) => {
      const titleElement = $(element).find('.mCBkyc');
      const linkElement = $(element).find('a');
      const snippetElement = $(element).find('.GI74Re');
      const sourceElement = $(element).find('.NUnG9d span');

      const title = titleElement.text().trim();
      const url = linkElement.attr('href');
      const snippet = snippetElement.text().trim();
      const source = sourceElement.text().trim();

      if (title && url) {
        articles.push({
          title,
          url,
          snippet: snippet || '',
          source: source || 'Unknown'
        });
      }
    });

    return articles.slice(0, 5);
  } catch (error) {
    console.error('Error searching related articles:', error);
    return [];
  }
}

// Combine all trending sources
export async function fetchAllTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const [googleTrends, twitterTrends, youtubeTrends] = await Promise.all([
      scrapeGoogleTrends(),
      fetchTwitterTrends(),
      fetchYouTubeTrending()
    ]);

    // Combine and deduplicate trends
    const allTrends = [...googleTrends, ...twitterTrends, ...youtubeTrends];
    const uniqueTrends = allTrends.filter((trend, index, self) => 
      index === self.findIndex(t => t.title.toLowerCase() === trend.title.toLowerCase())
    );

    return uniqueTrends.slice(0, 30); // Return top 30 unique trends
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return getFallbackTrends();
  }
}

// Enrich topic with media and related content
export async function enrichTopicWithMedia(topic: TrendingTopic): Promise<EnrichedTopic> {
  try {
    const [media, relatedArticles] = await Promise.all([
      searchRelatedMedia(topic.title),
      searchRelatedArticles(topic.title)
    ]);

    return {
      topic,
      media,
      relatedArticles
    };
  } catch (error) {
    console.error('Error enriching topic with media:', error);
    return {
      topic,
      media: { images: [], videos: [], tweets: [] },
      relatedArticles: []
    };
  }
}

// Fallback trending topics for demo/testing
function getFallbackTrends(): TrendingTopic[] {
  return [
    {
      title: 'AI and Machine Learning Trends 2024',
      source: 'google',
      relatedQueries: ['artificial intelligence', 'machine learning', 'AI trends', 'ML applications', 'AI future'],
      timestamp: new Date()
    },
    {
      title: 'Sustainable Technology Solutions',
      source: 'google',
      relatedQueries: ['green technology', 'renewable energy', 'sustainable development', 'eco-friendly tech', 'climate tech'],
      timestamp: new Date()
    },
    {
      title: 'Remote Work Best Practices',
      source: 'google',
      relatedQueries: ['work from home', 'remote productivity', 'digital nomad', 'virtual collaboration', 'remote team management'],
      timestamp: new Date()
    },
    {
      title: 'Cryptocurrency Market Analysis',
      source: 'google',
      relatedQueries: ['bitcoin', 'ethereum', 'crypto trading', 'blockchain technology', 'digital currency'],
      timestamp: new Date()
    },
    {
      title: 'Health and Wellness Technology',
      source: 'google',
      relatedQueries: ['health tech', 'fitness apps', 'mental health', 'wearable devices', 'telemedicine'],
      timestamp: new Date()
    }
  ];
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}