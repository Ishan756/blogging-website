'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  Twitter, 
  Youtube, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle,
  RefreshCw,
  Send,
  ExternalLink
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrendingTopic {
  title: string;
  source: 'google' | 'twitter' | 'youtube';
  searchVolume?: string;
  relatedQueries: string[];
  category?: string;
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

interface Comment {
  _id: string;
  content: string;
  author: {
    name: string;
    email: string;
    image?: string;
  };
  topicId: string;
  createdAt: string;
}

export function TrendingTopics() {
  const { data: session } = useSession();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState<{ [key: string]: boolean }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchTrendingTopics();
  }, []);

  const fetchTrendingTopics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trending-topics');
      const data = await response.json();
      setTopics(data.trends || []);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      toast.error('Failed to fetch trending topics');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (topicId: string) => {
    if (loadingComments[topicId]) return;
    
    setLoadingComments(prev => ({ ...prev, [topicId]: true }));
    try {
      const response = await fetch(`/api/trending-comments?topicId=${topicId}`);
      const data = await response.json();
      setComments(prev => ({ ...prev, [topicId]: data.comments || [] }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [topicId]: false }));
    }
  };

  const submitComment = async (topicId: string, topicTitle: string) => {
    if (!session) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = newComment[topicId]?.trim();
    if (!content) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingComment(prev => ({ ...prev, [topicId]: true }));
    try {
      const response = await fetch('/api/trending-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          topicId,
          topicTitle,
        }),
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [topicId]: '' }));
        fetchComments(topicId);
        toast.success('Comment posted successfully!');
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [topicId]: false }));
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />;
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'google':
        return 'bg-blue-100 text-blue-800';
      case 'twitter':
        return 'bg-blue-100 text-blue-800';
      case 'youtube':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Trending Topics</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="bg-muted h-4 rounded w-3/4 mb-2"></div>
                <div className="bg-muted h-3 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted h-20 rounded mb-4"></div>
                <div className="bg-muted h-3 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trending Topics</h2>
          <p className="text-muted-foreground">
            Latest trends from Google, Twitter, and YouTube
          </p>
        </div>
        <Button variant="outline" onClick={fetchTrendingTopics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic, index) => {
          const topicId = `${topic.source}-${index}`;
          const topicComments = comments[topicId] || [];
          
          return (
            <Card key={topicId} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 mb-2">
                    {getSourceIcon(topic.source)}
                    <Badge variant="secondary" className={getSourceColor(topic.source)}>
                      {topic.source}
                    </Badge>
                  </div>
                  {topic.url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={topic.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                
                <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {topic.title}
                </CardTitle>
                
                {topic.description && (
                  <CardDescription className="line-clamp-3">
                    {topic.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {topic.thumbnail && (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={topic.thumbnail}
                      alt={topic.title}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Engagement Stats */}
                {topic.engagement && (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {topic.engagement.views && (
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{topic.engagement.views}</span>
                      </div>
                    )}
                    {topic.engagement.likes && (
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{topic.engagement.likes}</span>
                      </div>
                    )}
                    {topic.engagement.comments && (
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{topic.engagement.comments}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Search Volume */}
                {topic.searchVolume && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Search Volume:</strong> {topic.searchVolume}
                  </div>
                )}

                {/* Related Queries */}
                {topic.relatedQueries.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topic.relatedQueries.slice(0, 3).map((query, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {query}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Comments Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Comments ({topicComments.length})</h4>
                    {topicComments.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchComments(topicId)}
                        disabled={loadingComments[topicId]}
                      >
                        {loadingComments[topicId] ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                        ) : (
                          'Load Comments'
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Comment Form */}
                  {session ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Share your thoughts..."
                        value={newComment[topicId] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [topicId]: e.target.value }))}
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => submitComment(topicId, topic.title)}
                        disabled={submittingComment[topicId] || !newComment[topicId]?.trim()}
                        className="w-full"
                      >
                        <Send className="h-3 w-3 mr-2" />
                        {submittingComment[topicId] ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Sign in to join the conversation
                      </p>
                      <Button size="sm" variant="outline" asChild>
                        <a href="/login">Sign In</a>
                      </Button>
                    </div>
                  )}

                  {/* Comments List */}
                  {topicComments.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {topicComments.slice(0, 3).map((comment) => (
                        <div key={comment._id} className="flex space-x-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={comment.author.image || ''} />
                            <AvatarFallback className="text-xs">
                              {comment.author.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium text-xs">{comment.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), 'MMM dd')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      {topicComments.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => fetchComments(topicId)}
                        >
                          View all {topicComments.length} comments
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {topics.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No trending topics available at the moment.</p>
          <Button variant="outline" onClick={fetchTrendingTopics} className="mt-4">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}