import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  content: string;
  author: {
    name: string;
    email: string;
    image?: string;
  };
  articleId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  content: { type: String, required: true },
  author: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String },
  },
  articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  isApproved: { type: Boolean, default: true },
}, {
  timestamps: true,
});

CommentSchema.index({ articleId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);