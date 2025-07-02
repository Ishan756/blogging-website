import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface TrendingTopic {
  title: string;
  searchVolume?: string;
  relatedQueries: string[];
}

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
        // Extract related queries from the same section
        const relatedQueries: string[] = [];
        $(element).find('.mZ3RIc').each((_, queryElement) => {
          const query = $(queryElement).text().trim();
          if (query && query !== title) {
            relatedQueries.push(query);
          }
        });

        trends.push({
          title,
          relatedQueries: relatedQueries.slice(0, 5), // Limit to 5 related queries
        });
      }
    });

    return trends.slice(0, 10); // Return top 10 trends
  } catch (error) {
    console.error('Error scraping Google Trends:', error);
    
    // Fallback trending topics for demo purposes
    return [
      {
        title: 'AI and Machine Learning Trends 2024',
        relatedQueries: ['artificial intelligence', 'machine learning', 'AI trends', 'ML applications', 'AI future']
      },
      {
        title: 'Sustainable Technology Solutions',
        relatedQueries: ['green technology', 'renewable energy', 'sustainable development', 'eco-friendly tech', 'climate tech']
      },
      {
        title: 'Remote Work Best Practices',
        relatedQueries: ['work from home', 'remote productivity', 'digital nomad', 'virtual collaboration', 'remote team management']
      },
      {
        title: 'Cryptocurrency Market Analysis',
        relatedQueries: ['bitcoin', 'ethereum', 'crypto trading', 'blockchain technology', 'digital currency']
      },
      {
        title: 'Health and Wellness Technology',
        relatedQueries: ['health tech', 'fitness apps', 'mental health', 'wearable devices', 'telemedicine']
      }
    ];
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}