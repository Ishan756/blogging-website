import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const comments = await Comment.find({ 
      articleId, 
      isApproved: true,
      parentId: null 
    })
      .sort({ createdAt: -1 })
      .populate('replies');

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { content, articleId, parentId } = await request.json();
    
    if (!content || !articleId) {
      return NextResponse.json(
        { error: 'Content and article ID are required' },
        { status: 400 }
      );
    }

    const comment = new Comment({
      content,
      articleId,
      parentId: parentId || null,
      author: {
        name: session.user.name!,
        email: session.user.email!,
        image: session.user.image,
      },
    });

    await comment.save();

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}