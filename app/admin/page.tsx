'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  FileText, 
  TrendingUp, 
  Users, 
  Eye,
  Plus,
  RefreshCw,
  Settings,
  Image,
  Video,
  MessageSquare,
  Globe,
  Twitter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface Article {
  _id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: string;
  tags: string[];
  trendingSource: 'google' | 'twitter' | 'manual';
  mediaCount?: {
    images: number;
    videos: number;
    tweets: number;
  };
}

interface TrendingTopic {
  title: string;
  source: 'google' | 'twitter';
  searchVolume?: string;
  relatedQueries: string[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchArticles();
    fetchTrendingTopics();
  }, [session, status, router]);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles?limit=10');
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingTopics = async () => {
    setLoadingTrends(true);
    try {
      const response = await fetch('/api/admin/generate-article');
      const data = await response.json();
      setTrendingTopics(data.trends || []);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
    } finally {
      setLoadingTrends(false);
    }
  };

  const generateArticle = async (topic?: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Article generated successfully! Media included: ${data.article.mediaCount?.images || 0} images, ${data.article.mediaCount?.videos || 0} videos, ${data.article.mediaCount?.tweets || 0} tweets`);
        setCustomTopic('');
        fetchArticles();
      } else {
        toast.error(data.error || 'Failed to generate article');
      }
    } catch (error) {
      toast.error('Failed to generate article');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFromTrend = async (trend: TrendingTopic) => {
    await generateArticle(trend.title);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalViews = articles.reduce((sum, article) => sum + article.views, 0);
  const totalMedia = articles.reduce((sum, article) => {
    const media = article.mediaCount;
    return sum + (media ? media.images + media.videos + media.tweets : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your content and generate new articles from trending topics
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground">
                {articles.filter(a => a.trendingSource === 'google').length} from Google Trends
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all articles
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Assets</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMedia}</div>
              <p className="text-xs text-muted-foreground">
                Images, videos, and tweets
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Live</div>
              <p className="text-xs text-muted-foreground">
                Auto-generating content
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Content Generation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Generate Content</span>
                </CardTitle>
                <CardDescription>
                  Create new articles from trending topics with rich media integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="trending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="trending">Trending</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="trending" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Current Trends</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchTrendingTopics}
                        disabled={loadingTrends}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingTrends ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    
                    {loadingTrends ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-muted h-16 rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {trendingTopics.map((trend, index) => (
                          <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {trend.source === 'google' ? (
                                    <Globe className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <Twitter className="h-3 w-3 text-blue-400" />
                                  )}
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {trend.source}
                                  </span>
                                </div>
                                <h5 className="text-sm font-medium line-clamp-2 mb-1">
                                  {trend.title}
                                </h5>
                                {trend.searchVolume && (
                                  <p className="text-xs text-muted-foreground">
                                    {trend.searchVolume} searches
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => generateFromTrend(trend)}
                                disabled={isGenerating}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      onClick={() => generateArticle()}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {isGenerating ? 'Generating...' : 'Generate from Random Trend'}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-topic">Custom Topic</Label>
                      <Input
                        id="custom-topic"
                        placeholder="Enter a custom topic..."
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                      />
                      <Button
                        onClick={() => generateArticle(customTopic)}
                        disabled={isGenerating || !customTopic.trim()}
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Custom Article
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Recent Articles */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Articles</CardTitle>
                  <CardDescription>
                    Your latest published content with media integration
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchArticles}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No articles yet. Generate your first article!</p>
                    </div>
                  ) : (
                    articles.map((article) => (
                      <div
                        key={article._id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {article.trendingSource === 'google' ? (
                              <Globe className="h-4 w-4 text-blue-500" />
                            ) : article.trendingSource === 'twitter' ? (
                              <Twitter className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Search className="h-4 w-4 text-gray-500" />
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {article.trendingSource}
                            </Badge>
                          </div>
                          
                          <h3 className="font-medium mb-2 line-clamp-2">
                            {article.title}
                          </h3>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {article.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          {article.mediaCount && (
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                              {article.mediaCount.images > 0 && (
                                <span className="flex items-center space-x-1">
                                  <Image className="h-3 w-3" />
                                  <span>{article.mediaCount.images}</span>
                                </span>
                              )}
                              {article.mediaCount.videos > 0 && (
                                <span className="flex items-center space-x-1">
                                  <Video className="h-3 w-3" />
                                  <span>{article.mediaCount.videos}</span>
                                </span>
                              )}
                              {article.mediaCount.tweets > 0 && (
                                <span className="flex items-center space-x-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{article.mediaCount.tweets}</span>
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            <span className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{article.views}</span>
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`/article/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}