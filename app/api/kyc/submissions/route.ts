import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const risk = url.searchParams.get('risk');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    let query = supabaseAdmin
      .from('kyc_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (risk && risk !== 'ALL') {
      query = query.eq('risk_level', risk);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Submissions] Query error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submissions: data || [],
      total: count || 0,
    });
  } catch (error: unknown) {
    console.error('[Submissions] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
