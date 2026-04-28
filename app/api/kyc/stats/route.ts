import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get today's start in UTC
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Today's submissions
    const { data: todayData } = await supabaseAdmin
      .from('kyc_submissions')
      .select('risk_level, status')
      .gte('created_at', todayStart.toISOString());

    const todaySubmissions = todayData || [];
    const todayStats = {
      total: todaySubmissions.length,
      high: todaySubmissions.filter((s) => s.risk_level === 'HIGH').length,
      medium: todaySubmissions.filter((s) => s.risk_level === 'MEDIUM').length,
      low: todaySubmissions.filter((s) => s.risk_level === 'LOW').length,
      pending: todaySubmissions.filter((s) => s.status === 'pending').length,
    };

    // All-time stats
    const { data: allData } = await supabaseAdmin
      .from('kyc_submissions')
      .select('risk_level, status');

    const allSubmissions = allData || [];
    const allTimeStats = {
      total: allSubmissions.length,
      approved: allSubmissions.filter((s) => s.status === 'approved').length,
      rejected: allSubmissions.filter((s) => s.status === 'rejected').length,
      escalated: allSubmissions.filter((s) => s.status === 'escalated').length,
      pending: allSubmissions.filter((s) => s.status === 'pending').length,
    };

    // Calculate fraud rate (HIGH risk as % of total)
    const highCount = allSubmissions.filter((s) => s.risk_level === 'HIGH').length;
    const fraudRate = allSubmissions.length > 0
      ? Math.round((highCount / allSubmissions.length) * 1000) / 1000
      : 0;

    return NextResponse.json({
      today: todayStats,
      allTime: allTimeStats,
      fraudRate,
    });
  } catch (error: unknown) {
    console.error('[Stats] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
