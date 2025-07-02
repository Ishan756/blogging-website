import mongoose, { Document, Schema } from 'mongoose';

export interface ITrendingComment extends Document {
  content: string;
  author: {
    name: string;
    email: string;
    image?: string;
  };
  topicId: string;
  topicTitle: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrendingCommentSchema = new Schema<ITrendingComment>({
  content: { type: String, required: true },
  author: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String },
  },
  topicId: { type: String, required: true },
  topicTitle: { type: String, required: true },
  isApproved: { type: Boolean, default: true },
}, {
  timestamps: true,
});

TrendingCommentSchema.index({ topicId: 1, createdAt: -1 });
TrendingCommentSchema.index({ author: 1 });

export default mongoose.models.TrendingComment || mongoose.model<ITrendingComment>('TrendingComment', TrendingCommentSchema);