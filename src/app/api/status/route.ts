import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const rows = await sql`SELECT MAX(updated_at) as last_updated, COUNT(*) as total FROM products`;
        return NextResponse.json({
            lastUpdated: rows[0]?.last_updated || null,
            totalProducts: parseInt(rows[0]?.total || '0'),
        });
    } catch (error) {
        console.error('Status query error:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
