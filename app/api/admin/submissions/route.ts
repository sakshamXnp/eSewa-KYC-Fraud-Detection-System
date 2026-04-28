import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured. Please add your keys to .env.local' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(req.url);
    const stats = searchParams.get('stats') === 'true';
    const risk = searchParams.get('risk');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (stats) {
      // Calculate start of today in Nepal (UTC+5:45)
      const now = new Date();
      // Adjust UTC to Nepal time
      const nepalTime = new Date(now.getTime() + (5.75 * 60 * 60 * 1000));
      // Reset to start of day in Nepal
      nepalTime.setUTCHours(0, 0, 0, 0);
      // Convert back to UTC to compare with DB timestamps
      const startOfTodayUTC = new Date(nepalTime.getTime() - (5.75 * 60 * 60 * 1000)).toISOString();

      // Fetch all for aggregation
      const { data: allData, error: allErr } = await supabaseAdmin
        .from('kyc_submissions')
        .select('status, risk_level, created_at');

      if (allErr) throw allErr;

      const statsResult = {
        today: { total: 0, high: 0, medium: 0, low: 0, pending: 0, approved: 0 },
        allTime: { total: 0, approved: 0, rejected: 0, escalated: 0, pending: 0 }
      };

      allData.forEach(sub => {
        statsResult.allTime.total++;
        if (sub.status === 'approved') statsResult.allTime.approved++;
        if (sub.status === 'rejected') statsResult.allTime.rejected++;
        if (sub.status === 'escalated') statsResult.allTime.escalated++;
        if (sub.status === 'pending') statsResult.allTime.pending++;

        if (sub.created_at >= startOfTodayUTC) {
          statsResult.today.total++;
          if (sub.risk_level === 'HIGH') statsResult.today.high++;
          if (sub.risk_level === 'MEDIUM') statsResult.today.medium++;
          if (sub.risk_level === 'LOW') statsResult.today.low++;
          if (sub.status === 'pending') statsResult.today.pending++;
          if (sub.status === 'approved') statsResult.today.approved++;
        }
      });

      return NextResponse.json(statsResult);
    }

    // List query
    let query = supabaseAdmin
      .from('kyc_submissions')
      .select('*', { count: 'exact' });

    if (risk && risk !== 'ALL') {
      query = query.eq('risk_level', risk);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status.toLowerCase());
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      submissions: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error: any) {
    console.error('[Admin Submissions GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
