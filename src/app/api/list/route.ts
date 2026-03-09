import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    try {
        const [countResult, rows] = await Promise.all([
            sql`SELECT COUNT(*)::int AS total FROM products`,
            sql`SELECT * FROM products ORDER BY stock_no ASC LIMIT ${limit} OFFSET ${offset}`,
        ]);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            rows,
            page,
            limit,
            total,
            totalPages,
        });
    } catch (error) {
        console.error('List error:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
