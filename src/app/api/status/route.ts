import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const [productRows, archiveRows] = await Promise.all([
            sql`SELECT MAX(updated_at) as last_updated, COUNT(*)::int as total FROM products`,
            sql`SELECT COUNT(DISTINCT archived_at)::int as archive_count FROM products_archive`,
        ]);
        return NextResponse.json({
            lastUpdated: productRows[0]?.last_updated || null,
            totalProducts: parseInt(productRows[0]?.total || '0'),
            archiveCount: archiveRows[0]?.archive_count || 0,
        });
    } catch (error) {
        console.error('Status query error:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
