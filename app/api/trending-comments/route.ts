import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import TrendingComment from '@/models/TrendingComment';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    
    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    const comments = await TrendingComment.find({ 
      topicId, 
      isApproved: true 
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching trending comments:', error);
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
    
    const { content, topicId, topicTitle } = await request.json();
    
    if (!content || !topicId || !topicTitle) {
      return NextResponse.json(
        { error: 'Content, topic ID, and topic title are required' },
        { status: 400 }
      );
    }

    const comment = new TrendingComment({
      content,
      topicId,
      topicTitle,
      author: {
        name: session.user.name!,
        email: session.user.email!,
        image: session.user.image,
      },
    });

    await comment.save();

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating trending comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}