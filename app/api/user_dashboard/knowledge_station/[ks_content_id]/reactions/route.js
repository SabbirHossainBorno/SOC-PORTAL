//app/api/user_dashboard/knowledge_station/[ks_content_id]/reactions/route.js
import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export async function POST(request, { params }) {
  // AWAIT THE PARAMS
  const { ks_content_id } = await params;
  const sessionId = request.cookies.get('sessionId')?.value || 'Unknown';
  const eid = request.cookies.get('eid')?.value || 'Unknown';
  const socPortalId = request.cookies.get('socPortalId')?.value || 'Unknown';

  let reactionType; // DECLARE reactionType AT TOP LEVEL

  try {
    const body = await request.json();
    reactionType = body.reactionType; // ASSIGN reactionType

    if (!['like', 'dislike'].includes(reactionType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Check if user is the content creator
    const contentCheck = await query(
      'SELECT upload_by FROM knowledge_station_content WHERE ks_content_id = $1',
      [ks_content_id]
    );

    if (contentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Content not found' },
        { status: 404 }
      );
    }

    const contentUploader = contentCheck.rows[0].upload_by;
    
    // Prevent creator from reacting to their own content
    if (contentUploader === socPortalId) {
      return NextResponse.json(
        { success: false, message: 'You cannot react to your own content' },
        { status: 400 }
      );
    }

    // Check if user already reacted
    const existingReaction = await query(
      'SELECT * FROM knowledge_station_reactions WHERE ks_content_id = $1 AND soc_portal_id = $2',
      [ks_content_id, socPortalId]
    );

    let likeChange = 0;
    let dislikeChange = 0;

    if (existingReaction.rows.length > 0) {
      const existingType = existingReaction.rows[0].reaction_type;
      
      if (existingType === reactionType) {
        // Remove reaction if same type clicked again
        await query(
          'DELETE FROM knowledge_station_reactions WHERE ks_content_id = $1 AND soc_portal_id = $2',
          [ks_content_id, socPortalId]
        );
        
        if (reactionType === 'like') {
          likeChange = -1;
        } else {
          dislikeChange = -1;
        }
      } else {
        // Change reaction type
        await query(
          'UPDATE knowledge_station_reactions SET reaction_type = $1 WHERE ks_content_id = $2 AND soc_portal_id = $3',
          [reactionType, ks_content_id, socPortalId]
        );
        
        if (reactionType === 'like') {
          likeChange = 1;
          dislikeChange = -1;
        } else {
          likeChange = -1;
          dislikeChange = 1;
        }
      }
    } else {
      // Add new reaction
      await query(
        'INSERT INTO knowledge_station_reactions (ks_content_id, soc_portal_id, reaction_type) VALUES ($1, $2, $3)',
        [ks_content_id, socPortalId, reactionType]
      );
      
      if (reactionType === 'like') {
        likeChange = 1;
      } else {
        dislikeChange = 1;
      }
    }

    // Update counts in main table
    await query(
      `UPDATE knowledge_station_content 
       SET like_count = GREATEST(0, like_count + $1), 
           dislike_count = GREATEST(0, dislike_count + $2)
       WHERE ks_content_id = $3`,
      [likeChange, dislikeChange, ks_content_id]
    );

    // Get updated counts
    const updatedContent = await query(
      'SELECT like_count, dislike_count FROM knowledge_station_content WHERE ks_content_id = $1',
      [ks_content_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        like_count: updatedContent.rows[0].like_count,
        dislike_count: updatedContent.rows[0].dislike_count
      }
    });

  } catch (error) {
    logger.error('Failed to process reaction', {
      meta: {
        eid,
        sid: sessionId,
        taskName: 'KnowledgeReaction',
        details: `Error: ${error.message}`,
        userId: socPortalId,
        ks_content_id,
        reactionType: reactionType || 'unknown',
        error: error.message
      }
    });

    return NextResponse.json(
      { success: false, message: 'Failed to process reaction' },
      { status: 500 }
    );
  }
}