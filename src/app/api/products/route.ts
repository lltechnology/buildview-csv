import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const stockNo = request.nextUrl.searchParams.get('stock_no');

    if (!stockNo) {
        return NextResponse.json({ error: 'stock_no parameter is required' }, { status: 400 });
    }

    try {
        const rows = await sql`SELECT * FROM products WHERE LOWER(stock_no) = LOWER(${stockNo})`;

        if (rows.length === 0) {
            return NextResponse.json({ error: `Product with stock number "${stockNo}" not found.` }, { status: 404 });
        }

        return NextResponse.json({ product: rows[0] });
    } catch (error) {
        console.error('Database query error:', error);
        return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
}
