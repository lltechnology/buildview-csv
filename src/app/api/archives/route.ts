import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const rows = await sql`
            SELECT
                archived_at,
                COUNT(*)::int AS total_products,
                MIN(stock_no) AS first_stock_no,
                MAX(stock_no) AS last_stock_no
            FROM products_archive
            GROUP BY archived_at
            ORDER BY archived_at DESC
            LIMIT 20
        `;
        return NextResponse.json({ archives: rows });
    } catch (error) {
        console.error('Archives query error:', error);
        return NextResponse.json({ error: 'Failed to fetch archives' }, { status: 500 });
    }
}
