import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ArticleRequest {
  topic: string;
  keywords: string[];
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
}

export async function generateArticle(request: ArticleRequest): Promise<GeneratedArticle> {
  const prompt = `Write a comprehensive, SEO-optimized blog article about "${request.topic}". 

Requirements:
- 1500-2000 words
- Include H1, H2, and H3 headings
- Use the keywords: ${request.keywords.join(', ')}
- Write in an engaging, informative style
- Include actionable insights
- Format in HTML with proper semantic tags
- Suggest relevant image descriptions for featured image

Also provide:
- SEO title (under 60 characters)
- Meta description (under 160 characters)
- Article excerpt (under 200 characters)
- 5-7 relevant tags
- OpenGraph title and description

Format the response as JSON with the following structure:
{
  "title": "Main article title",
  "content": "Full HTML content with headings and paragraphs",
  "excerpt": "Brief article summary",
  "metaTitle": "SEO optimized title",
  "metaDescription": "SEO meta description",
  "ogTitle": "OpenGraph title",
  "ogDescription": "OpenGraph description", 
  "tags": ["tag1", "tag2", "tag3"],
  "featuredImageDescription": "Description for AI image generation"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert SEO content writer and blogger. Create engaging, well-structured articles that rank well in search engines.',
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
    
    // Generate a placeholder image URL (in production, you'd use AI image generation or stock photos)
    const featuredImage = `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=400&fit=crop&crop=center&auto=format`;
    
    return {
      title: parsed.title,
      content: parsed.content,
      excerpt: parsed.excerpt,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      ogTitle: parsed.ogTitle,
      ogDescription: parsed.ogDescription,
      tags: parsed.tags,
      featuredImage,
    };
  } catch (error) {
    throw new Error('Failed to parse OpenAI response');
  }
}