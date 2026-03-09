const { neon } = require('@neondatabase/serverless');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function seed() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);
    const csvPath = path.join(__dirname, '..', 'backup', 'data.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('data.csv not found at:', csvPath);
        process.exit(1);
    }

    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const fields = parsed.meta.fields;
    const data = parsed.data;

    console.log(`Parsed ${data.length} rows from CSV`);

    let inserted = 0;
    let errors = 0;

    for (const row of data) {
        const stockNo = row[fields[0]]?.trim();
        if (!stockNo) continue;

        try {
            await sql`
        INSERT INTO products (
          stock_no, description, as_is, code_18k, code_14k, code_10k, code_9k,
          silver_code, gold_weight,
          stn1_type, stn1_qty, stn1_weight,
          stn2_type, stn2_qty, stn2_weight,
          stn3_type, stn3_qty, stn3_weight,
          stn4_type, stn4_qty, stn4_weight
        ) VALUES (
          ${stockNo},
          ${row['Description'] || ''},
          ${parseInt(row['As is'] || '0') || 0},
          ${parseInt(row['18K Code'] || '0') || 0},
          ${parseInt(row['14K Code'] || '0') || 0},
          ${parseInt(row['10K Code'] || '0') || 0},
          ${parseInt(row['9K Code'] || '0') || 0},
          ${parseInt(row['Silver Code'] || '0') || 0},
          ${parseFloat(row['Gold weight'] || '0') || 0},
          ${row['1st Stn'] || ''},
          ${parseInt(row['1st Stn qty'] || '0') || 0},
          ${parseFloat(row['1st Stn weight'] || '0') || 0},
          ${row['2nd Stn'] || ''},
          ${parseInt(row['2nd Stn qty'] || '0') || 0},
          ${parseFloat(row['2nd Stn weight'] || '0') || 0},
          ${row['3rd Stn'] || ''},
          ${parseInt(row['3rd Stn qty'] || '0') || 0},
          ${parseFloat(row['3rd Stn weight'] || '0') || 0},
          ${row['4th Stn'] || ''},
          ${parseInt(row['4th Stn qty'] || '0') || 0},
          ${parseFloat(row['4th Stn weight'] || '0') || 0}
        )
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
            inserted++;
            if (inserted % 50 === 0) console.log(`  Inserted ${inserted} rows...`);
        } catch (err) {
            errors++;
            console.error(`Error on stock_no ${stockNo}:`, err);
        }
    }

    console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
}

seed().catch(console.error);
