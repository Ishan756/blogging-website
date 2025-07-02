import OpenAI from 'openai';
import { EnrichedTopic, MediaContent } from './trending-scraper';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArticleRequest {
  topic: string;
  keywords: string[];
  enrichedData?: EnrichedTopic;
}

export interface GeneratedArticle {
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  tags: string[];
  featuredImage: string;
  media: {
    images: Array<{
      url: string;
      alt: string;
      caption?: string;
    }>;
    videos: Array<{
      url: string;
      title: string;
      embedCode: string;
    }>;
    tweets: Array<{
      id: string;
      embedCode: string;
    }>;
  };
  structuredData: {
    type: 'Article';
    headline: string;
    author: string;
    datePublished: string;
    dateModified: string;
    description: string;
    image: string;
  };
}

export async function generateEnhancedArticle(request: ArticleRequest): Promise<GeneratedArticle> {
  const { topic, keywords, enrichedData } = request;

  // Prepare context from enriched data
  let contextPrompt = '';
  if (enrichedData) {
    contextPrompt = `
    
ADDITIONAL CONTEXT:
- Related Articles: ${enrichedData.relatedArticles.map(a => `"${a.title}" - ${a.snippet}`).join('; ')}
- Available Images: ${enrichedData.media.images.length} high-quality images
- Available Videos: ${enrichedData.media.videos.map(v => v.title).join(', ')}
- Related Tweets: ${enrichedData.media.tweets.length} relevant social media posts
`;
  }

  const prompt = `Write a comprehensive, SEO-optimized blog article about "${topic}".

Requirements:
- 2000-2500 words
- Include H1, H2, and H3 headings with proper hierarchy
- Use the keywords naturally: ${keywords.join(', ')}
- Write in an engaging, authoritative style
- Include actionable insights and practical advice
- Add calls-to-action and engagement elements
- Format in clean HTML with semantic tags
- Include placeholder spots for media integration
- Optimize for featured snippets and voice search
- Include internal linking opportunities

${contextPrompt}

MEDIA INTEGRATION INSTRUCTIONS:
- Include [IMAGE-1], [IMAGE-2], etc. placeholders where relevant images should be inserted
- Include [VIDEO-1], [VIDEO-2], etc. placeholders where videos would enhance the content
- Include [TWEET-1], [TWEET-2], etc. placeholders where social media embeds would add value
- Ensure media placements enhance the narrative and break up text naturally

SEO OPTIMIZATION:
- Target long-tail keywords and semantic variations
- Include FAQ sections for voice search optimization
- Use schema markup friendly structure
- Optimize for E-A-T (Expertise, Authoritativeness, Trustworthiness)

Format the response as JSON with the following structure:
{
  "title": "Compelling article title (under 60 characters)",
  "content": "Full HTML content with headings, paragraphs, and media placeholders",
  "excerpt": "Engaging article summary (under 200 characters)",
  "metaTitle": "SEO optimized title (under 60 characters)",
  "metaDescription": "Compelling meta description (under 160 characters)",
  "ogTitle": "Social media optimized title",
  "ogDescription": "Social media description (under 200 characters)", 
  "tags": ["primary-tag", "secondary-tag", "long-tail-keyword", "category-tag", "trending-tag"],
  "mediaPlaceholders": {
    "images": ["Description of IMAGE-1", "Description of IMAGE-2"],
    "videos": ["Description of VIDEO-1"],
    "tweets": ["Context for TWEET-1"]
  }
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert SEO content strategist and blogger with deep knowledge of content marketing, search engine optimization, and digital media integration. Create content that ranks well, engages readers, and drives conversions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const response = completion.choices[0].message.content;
  
  if (!response) {
    throw new Error('Failed to generate article content');
  }

  try {
    const parsed = JSON.parse(response);
    
    // Process and integrate actual media
    const processedMedia = await processMediaIntegration(parsed.content, enrichedData?.media);
    
    // Select featured image
    const featuredImage = enrichedData?.media.images[0]?.url || 
      `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop&crop=center&auto=format`;
    
    return {
      title: parsed.title,
      content: processedMedia.content,
      excerpt: parsed.excerpt,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      ogTitle: parsed.ogTitle,
      ogDescription: parsed.ogDescription,
      tags: parsed.tags,
      featuredImage,
      media: processedMedia.media,
      structuredData: {
        type: 'Article',
        headline: parsed.title,
        author: 'TrendWise Editorial Team',
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        description: parsed.metaDescription,
        image: featuredImage,
      },
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw new Error('Failed to parse OpenAI response');
  }
}

async function processMediaIntegration(content: string, mediaContent?: MediaContent) {
  if (!mediaContent) {
    return {
      content: content.replace(/\[IMAGE-\d+\]/g, '').replace(/\[VIDEO-\d+\]/g, '').replace(/\[TWEET-\d+\]/g, ''),
      media: { images: [], videos: [], tweets: [] }
    };
  }

  let processedContent = content;
  const usedMedia = {
    images: [] as Array<{ url: string; alt: string; caption?: string }>,
    videos: [] as Array<{ url: string; title: string; embedCode: string }>,
    tweets: [] as Array<{ id: string; embedCode: string }>
  };

  // Replace image placeholders
  let imageIndex = 0;
  processedContent = processedContent.replace(/\[IMAGE-(\d+)\]/g, (match, num) => {
    if (imageIndex < mediaContent.images.length) {
      const image = mediaContent.images[imageIndex];
      usedMedia.images.push({
        url: image.url,
        alt: image.alt,
        caption: `Image related to the article topic`
      });
      imageIndex++;
      return `<figure class="my-8">
        <img src="${image.url}" alt="${image.alt}" class="w-full rounded-lg shadow-lg" />
        <figcaption class="text-sm text-gray-600 mt-2 text-center italic">${image.alt}</figcaption>
      </figure>`;
    }
    return '';
  });

  // Replace video placeholders
  let videoIndex = 0;
  processedContent = processedContent.replace(/\[VIDEO-(\d+)\]/g, (match, num) => {
    if (videoIndex < mediaContent.videos.length) {
      const video = mediaContent.videos[videoIndex];
      const embedCode = video.source === 'youtube' 
        ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.url.split('v=')[1]}" frameborder="0" allowfullscreen></iframe>`
        : `<a href="${video.url}" target="_blank" rel="noopener noreferrer" class="block">${video.title}</a>`;
      
      usedMedia.videos.push({
        url: video.url,
        title: video.title,
        embedCode
      });
      videoIndex++;
      return `<div class="my-8">
        <div class="aspect-video rounded-lg overflow-hidden shadow-lg">
          ${embedCode}
        </div>
        <p class="text-sm text-gray-600 mt-2">${video.title}</p>
      </div>`;
    }
    return '';
  });

  // Replace tweet placeholders
  let tweetIndex = 0;
  processedContent = processedContent.replace(/\[TWEET-(\d+)\]/g, (match, num) => {
    if (tweetIndex < mediaContent.tweets.length) {
      const tweet = mediaContent.tweets[tweetIndex];
      usedMedia.tweets.push({
        id: tweet.id,
        embedCode: tweet.embedCode
      });
      tweetIndex++;
      return `<div class="my-8">
        ${tweet.embedCode}
      </div>`;
    }
    return '';
  });

  return {
    content: processedContent,
    media: usedMedia
  };
}

// Generate article from trending topic with full media integration
export async function generateArticleFromTrend(enrichedTopic: EnrichedTopic): Promise<GeneratedArticle> {
  const keywords = [
    enrichedTopic.topic.title,
    ...enrichedTopic.topic.relatedQueries,
    ...enrichedTopic.relatedArticles.slice(0, 3).map(a => a.title.split(' ').slice(0, 2).join(' '))
  ].slice(0, 10);

  return generateEnhancedArticle({
    topic: enrichedTopic.topic.title,
    keywords,
    enrichedData: enrichedTopic
  });
}