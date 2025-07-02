import mongoose, { Document, Schema } from 'mongoose';

export interface IArticle extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  tags: string[];
  trendingTopic: string;
  trendingSource: 'google' | 'twitter' | 'manual' | 'youtube';
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
    type: string;
    headline: string;
    author: string;
    datePublished: string;
    dateModified: string;
    description: string;
    image: string;
  };
  relatedArticles: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }>;
  publishedAt: Date;
  isPublished: boolean;
  views: number;
  shares: number;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true },
  featuredImage: { type: String, required: true },
  metaTitle: { type: String, required: true },
  metaDescription: { type: String, required: true },
  ogTitle: { type: String, required: true },
  ogDescription: { type: String, required: true },
  ogImage: { type: String, required: true },
  tags: [{ type: String }],
  trendingTopic: { type: String, required: true },
  trendingSource: { type: String, enum: ['google', 'twitter', 'manual' , 'youtube'], default: 'google' },
  media: {
    images: [{
      url: { type: String, required: true },
      alt: { type: String, required: true },
      caption: { type: String }
    }],
    videos: [{
      url: { type: String, required: true },
      title: { type: String, required: true },
      embedCode: { type: String, required: true }
    }],
    tweets: [{
      id: { type: String, required: true },
      embedCode: { type: String, required: true }
    }]
  },
  structuredData: {
    type: { type: String, default: 'Article' },
    headline: { type: String, required: true },
    author: { type: String, required: true },
    datePublished: { type: String, required: true },
    dateModified: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
  },
  relatedArticles: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    snippet: { type: String },
    source: { type: String }
  }],
  publishedAt: { type: Date, default: Date.now },
  isPublished: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Indexes for performance
ArticleSchema.index({ slug: 1 });
ArticleSchema.index({ publishedAt: -1 });
ArticleSchema.index({ tags: 1 });
ArticleSchema.index({ trendingSource: 1 });
ArticleSchema.index({ engagementScore: -1 });
ArticleSchema.index({ views: -1 });

// Virtual for OG image fallback
ArticleSchema.virtual('ogImageUrl').get(function() {
  return this.ogImage || this.featuredImage;
});

export default mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);