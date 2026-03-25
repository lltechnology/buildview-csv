import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

interface CsvRow {
    [key: string]: string;
}

const BATCH_SIZE = 50; // rows per INSERT statement

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const parsed = Papa.parse<CsvRow>(text, {
            header: true,
            skipEmptyLines: true,
        });

        if (parsed.errors.length > 0) {
            return NextResponse.json({ error: 'CSV parsing error', details: parsed.errors }, { status: 400 });
        }

        const data = parsed.data;
        if (data.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
        }

        const fields = parsed.meta.fields;
        if (!fields || fields.length === 0) {
            return NextResponse.json({ error: 'CSV has no headers' }, { status: 400 });
        }

        // Parse all rows upfront
        const rows = data
            .map((row) => {
                const stockNo = row[fields[0]]?.trim();
                if (!stockNo) return null;
                return {
                    stockNo,
                    description: row['Description'] || '',
                    asIs: parseInt(row['As is'] || '0') || 0,
                    code18k: parseInt(row['18K Code'] || '0') || 0,
                    code14k: parseInt(row['14K Code'] || '0') || 0,
                    code10k: parseInt(row['10K Code'] || '0') || 0,
                    code9k: parseInt(row['9K Code'] || '0') || 0,
                    silverCode: parseInt(row['Silver Code'] || '0') || 0,
                    goldWeight: parseFloat(row['Gold weight'] || '0') || 0,
                    stn1Type: row['1st Stn'] || '',
                    stn1Qty: parseInt(row['1st Stn qty'] || '0') || 0,
                    stn1Weight: parseFloat(row['1st Stn weight'] || '0') || 0,
                    stn2Type: row['2nd Stn'] || '',
                    stn2Qty: parseInt(row['2nd Stn qty'] || '0') || 0,
                    stn2Weight: parseFloat(row['2nd Stn weight'] || '0') || 0,
                    stn3Type: row['3rd Stn'] || '',
                    stn3Qty: parseInt(row['3rd Stn qty'] || '0') || 0,
                    stn3Weight: parseFloat(row['3rd Stn weight'] || '0') || 0,
                    stn4Type: row['4th Stn'] || '',
                    stn4Qty: parseInt(row['4th Stn qty'] || '0') || 0,
                    stn4Weight: parseFloat(row['4th Stn weight'] || '0') || 0,
                };
            })
            .filter(Boolean) as NonNullable<ReturnType<typeof Object>>[];

        const total = rows.length;

        // Stream progress using SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let processed = 0;
                let inserted = 0;
                let errorCount = 0;
                let archivedCount = 0;

                function sendProgress(status: string) {
                    const event = JSON.stringify({ current: processed, total, inserted, archived: archivedCount, errors: errorCount, status });
                    controller.enqueue(encoder.encode(`data: ${event}\n\n`));
                }

                sendProgress('archiving');

                // Step 1: Archive existing products
                try {
                    const archiveResult = await sql`
                        INSERT INTO products_archive (
                            stock_no, description, as_is, code_18k, code_14k, code_10k, code_9k,
                            silver_code, gold_weight,
                            stn1_type, stn1_qty, stn1_weight,
                            stn2_type, stn2_qty, stn2_weight,
                            stn3_type, stn3_qty, stn3_weight,
                            stn4_type, stn4_qty, stn4_weight,
                            created_at, updated_at, archived_at
                        )
                        SELECT
                            stock_no, description, as_is, code_18k, code_14k, code_10k, code_9k,
                            silver_code, gold_weight,
                            stn1_type, stn1_qty, stn1_weight,
                            stn2_type, stn2_qty, stn2_weight,
                            stn3_type, stn3_qty, stn3_weight,
                            stn4_type, stn4_qty, stn4_weight,
                            created_at, updated_at, NOW()
                        FROM products
                    `;
                    archivedCount = archiveResult.length;
                } catch (archiveErr) {
                    console.error('Archive error:', archiveErr);
                    // Continue even if archive fails (table might be empty)
                }

                sendProgress('clearing');

                // Step 2: Clear the products table
                try {
                    await sql`TRUNCATE TABLE products RESTART IDENTITY`;
                } catch (truncErr) {
                    console.error('Truncate error:', truncErr);
                    // If truncate fails, try delete
                    await sql`DELETE FROM products`;
                }

                sendProgress('processing');

                // Step 3: Insert new CSV data in batches
                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);

                    try {
                        const stockNos = batch.map((r) => r.stockNo);
                        const descriptions = batch.map((r) => r.description);
                        const asIss = batch.map((r) => r.asIs);
                        const code18ks = batch.map((r) => r.code18k);
                        const code14ks = batch.map((r) => r.code14k);
                        const code10ks = batch.map((r) => r.code10k);
                        const code9ks = batch.map((r) => r.code9k);
                        const silverCodes = batch.map((r) => r.silverCode);
                        const goldWeights = batch.map((r) => r.goldWeight);
                        const stn1Types = batch.map((r) => r.stn1Type);
                        const stn1Qtys = batch.map((r) => r.stn1Qty);
                        const stn1Weights = batch.map((r) => r.stn1Weight);
                        const stn2Types = batch.map((r) => r.stn2Type);
                        const stn2Qtys = batch.map((r) => r.stn2Qty);
                        const stn2Weights = batch.map((r) => r.stn2Weight);
                        const stn3Types = batch.map((r) => r.stn3Type);
                        const stn3Qtys = batch.map((r) => r.stn3Qty);
                        const stn3Weights = batch.map((r) => r.stn3Weight);
                        const stn4Types = batch.map((r) => r.stn4Type);
                        const stn4Qtys = batch.map((r) => r.stn4Qty);
                        const stn4Weights = batch.map((r) => r.stn4Weight);

                        const results = await sql`
                          INSERT INTO products (
                            stock_no, description, as_is, code_18k, code_14k, code_10k, code_9k,
                            silver_code, gold_weight,
                            stn1_type, stn1_qty, stn1_weight,
                            stn2_type, stn2_qty, stn2_weight,
                            stn3_type, stn3_qty, stn3_weight,
                            stn4_type, stn4_qty, stn4_weight,
                            updated_at
                          )
                          SELECT * FROM unnest(
                            ${stockNos}::varchar[],
                            ${descriptions}::text[],
                            ${asIss}::int[],
                            ${code18ks}::int[],
                            ${code14ks}::int[],
                            ${code10ks}::int[],
                            ${code9ks}::int[],
                            ${silverCodes}::int[],
                            ${goldWeights}::decimal[],
                            ${stn1Types}::varchar[],
                            ${stn1Qtys}::int[],
                            ${stn1Weights}::decimal[],
                            ${stn2Types}::varchar[],
                            ${stn2Qtys}::int[],
                            ${stn2Weights}::decimal[],
                            ${stn3Types}::varchar[],
                            ${stn3Qtys}::int[],
                            ${stn3Weights}::decimal[],
                            ${stn4Types}::varchar[],
                            ${stn4Qtys}::int[],
                            ${stn4Weights}::decimal[]
                          ) AS t(
                            stock_no, description, as_is, code_18k, code_14k, code_10k, code_9k,
                            silver_code, gold_weight,
                            stn1_type, stn1_qty, stn1_weight,
                            stn2_type, stn2_qty, stn2_weight,
                            stn3_type, stn3_qty, stn3_weight,
                            stn4_type, stn4_qty, stn4_weight
                          ), (SELECT NOW() AS updated_at) AS ts
                          ON CONFLICT (stock_no) DO UPDATE SET
                            description = EXCLUDED.description,
                            as_is = EXCLUDED.as_is,
                            code_18k = EXCLUDED.code_18k,
                            code_14k = EXCLUDED.code_14k,
                            code_10k = EXCLUDED.code_10k,
                            code_9k = EXCLUDED.code_9k,
                            silver_code = EXCLUDED.silver_code,
                            gold_weight = EXCLUDED.gold_weight,
                            stn1_type = EXCLUDED.stn1_type,
                            stn1_qty = EXCLUDED.stn1_qty,
                            stn1_weight = EXCLUDED.stn1_weight,
                            stn2_type = EXCLUDED.stn2_type,
                            stn2_qty = EXCLUDED.stn2_qty,
                            stn2_weight = EXCLUDED.stn2_weight,
                            stn3_type = EXCLUDED.stn3_type,
                            stn3_qty = EXCLUDED.stn3_qty,
                            stn3_weight = EXCLUDED.stn3_weight,
                            stn4_type = EXCLUDED.stn4_type,
                            stn4_qty = EXCLUDED.stn4_qty,
                            stn4_weight = EXCLUDED.stn4_weight,
                            updated_at = NOW()
                        `;

                        inserted += results.length;
                    } catch {
                        errorCount += batch.length;
                    }

                    processed = Math.min(i + BATCH_SIZE, rows.length);
                    sendProgress('processing');
                }

                // Send final complete event
                const finalEvent = JSON.stringify({
                    current: total,
                    total,
                    inserted,
                    archived: archivedCount,
                    errors: errorCount,
                    status: 'complete',
                });
                controller.enqueue(encoder.encode(`data: ${finalEvent}\n\n`));
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload processing failed' }, { status: 500 });
    }
}
