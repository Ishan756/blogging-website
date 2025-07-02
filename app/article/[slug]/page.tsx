import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import Article, { IArticle } from '@/models/Article';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CommentForm } from '@/components/comment-form';
import { CommentList } from '@/components/comment-list';
import { Calendar, Eye, ArrowLeft, Share2, Globe, Twitter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface ArticlePageProps {
  params: { slug: string };
}

async function getArticle(slug: string) {
  await dbConnect();
  
  const article = await Article.findOne({ 
    slug, 
    isPublished: true 
  }).lean<IArticle>();

  if (!article) {
    return null;
  }

  return {
   ...article,
    _id: article._id.toString(), // ✅ Now `_id` is correctly typed
    publishedAt: article.publishedAt instanceof Date
      ? article.publishedAt.toISOString()
      : new Date(article.publishedAt).toISOString(),
    createdAt: article.createdAt instanceof Date
      ? article.createdAt.toISOString()
      : new Date(article.createdAt).toISOString(),
    updatedAt: article.updatedAt instanceof Date
      ? article.updatedAt.toISOString()
      : new Date(article.updatedAt).toISOString(),
  };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    keywords: article.tags.join(', '),
    authors: [{ name: 'TrendWise Team' }],
    openGraph: {
      title: article.ogTitle,
      description: article.ogDescription,
      images: [
        {
          url: article.ogImage || article.featuredImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      type: 'article',
      publishedTime: article.publishedAt,
      authors: ['TrendWise Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.ogTitle,
      description: article.ogDescription,
      images: [article.ogImage || article.featuredImage],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  // Increment view count
  await Article.findByIdAndUpdate(article._id, { 
    $inc: { views: 1 } 
  });

  const getTrendingSourceIcon = (source: string) => {
    switch (source) {
      case 'google':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(article.structuredData),
        }}
      />
      
      <article className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Article Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-6">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex items-center space-x-2">
                {getTrendingSourceIcon(article.trendingSource)}
                <Badge variant="secondary" className="text-xs">
                  {article.trendingSource} trending
                </Badge>
              </div>
              {article.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <div className="flex items-center space-x-6 text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(article.publishedAt), 'MMMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>{(article.views + 1).toLocaleString()} views</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            <div className="relative mb-8 rounded-lg overflow-hidden">
              <Image
                src={article.featuredImage}
                alt={article.title}
                width={800}
                height={400}
                className="w-full h-64 md:h-96 object-cover"
                priority
              />
            </div>
          </div>

          {/* Article Content with Rich Media */}
          <div className="prose prose-lg max-w-none mb-12">
            <div
              dangerouslySetInnerHTML={{ __html: article.content }}
              className="article-content"
            />
          </div>

          {/* Related Articles Section */}
          {article.relatedArticles && article.relatedArticles.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.relatedArticles.slice(0, 4).map((related, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <h4 className="font-medium mb-2 line-clamp-2">
                      <a 
                        href={related.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {related.title}
                      </a>
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {related.snippet}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {related.source}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-12" />

          {/* Comments Section */}
          <div className="space-y-8">
            <CommentForm 
              articleId={article._id} 
              onCommentAdded={() => window.location.reload()} 
            />
            <CommentList articleId={article._id} refreshTrigger={0} />
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}