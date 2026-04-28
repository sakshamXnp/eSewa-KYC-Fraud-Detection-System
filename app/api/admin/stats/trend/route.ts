import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Last 7 days in Nepal time
    const now = new Date();
    // Offset for Nepal (UTC+5:45)
    const nepalOffset = 5.75 * 60 * 60 * 1000;
    
    const results = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nepalDate = new Date(date.getTime() + nepalOffset);
      const year = nepalDate.getUTCFullYear();
      const month = String(nepalDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(nepalDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayLabel = nepalDate.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });
      
      // Calculate start and end of this day in UTC
      const startOfDayNepal = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));
      const startOfDayUTC = new Date(startOfDayNepal.getTime() - nepalOffset).toISOString();
      const endOfDayUTC = new Date(startOfDayNepal.getTime() + 24 * 60 * 60 * 1000 - nepalOffset).toISOString();

      const { data, error } = await supabaseAdmin
        .from('kyc_submissions')
        .select('risk_level')
        .gte('created_at', startOfDayUTC)
        .lt('created_at', endOfDayUTC);

      if (error) throw error;

      const counts = { high: 0, medium: 0, low: 0 };
      data.forEach(sub => {
        if (sub.risk_level === 'HIGH') counts.high++;
        else if (sub.risk_level === 'MEDIUM') counts.medium++;
        else if (sub.risk_level === 'LOW') counts.low++;
      });

      results.push({
        date: dateStr,
        label: dayLabel,
        ...counts
      });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[Admin Trend API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
