import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, reviewer_note } = body;

    const validStatuses = ['approved', 'rejected', 'escalated'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('kyc_submissions')
      .update({
        status,
        reviewer_note,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated: {
        id: data.id,
        status: data.status,
        reviewed_at: data.reviewed_at
      }
    });
  } catch (error: any) {
    console.error('[Admin Status PATCH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
