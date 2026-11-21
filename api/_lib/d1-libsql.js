/**
 * شبیه‌ساز D1 روی libSQL (Turso).
 * کد برنامه با همان API کلادفلر نوشته شده: prepare / bind / first / all / run / batch
 * این فایل همان API را روی پایگاه‌داده Turso فراهم می‌کند.
 */
import { createClient } from '@libsql/client';

const norm = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'bigint') return Number(v);
  return v;
};

const toPlain = (columns, row) => {
  const out = {};
  for (const c of columns) out[c] = row[c];
  return out;
};

class Stmt {
  constructor(run, sql, params) {
    this._run = run;
    this.sql = sql;
    this.params = params || [];
  }

  bind(...args) {
    return new Stmt(this._run, this.sql, args);
  }

  async exec() {
    return this._run({ sql: this.sql, args: this.params.map(norm) });
  }

  async first(column) {
    const rs = await this.exec();
    const row = rs.rows && rs.rows[0];
    if (!row) return null;
    const plain = toPlain(rs.columns, row);
    return column ? plain[column] : plain;
  }

  async all() {
    const rs = await this.exec();
    return {
      success: true,
      results: (rs.rows || []).map((r) => toPlain(rs.columns, r)),
      meta: { changes: Number(rs.rowsAffected || 0) },
    };
  }

  async run() {
    const rs = await this.exec();
    return {
      success: true,
      meta: {
        changes: Number(rs.rowsAffected || 0),
        last_row_id: Number(rs.lastInsertRowid || 0),
      },
    };
  }
}

class D1 {
  constructor(client) {
    this.client = client;
  }

  prepare(sql) {
    return new Stmt((q) => this.client.execute(q), sql, []);
  }

  async batch(statements) {
    if (!statements.length) return [];
    // همه‌ی دستورها در یک درخواست به Turso می‌روند (خیلی سریع‌تر از یکی‌یکی)
    try {
      const sets = await this.client.batch(
        statements.map((st) => ({ sql: st.sql, args: st.params.map(norm) })),
        'write'
      );
      return sets.map((rs) => ({
        success: true,
        results: (rs.rows || []).map((r) => toPlain(rs.columns, r)),
        meta: { changes: Number(rs.rowsAffected || 0) },
      }));
    } catch (err) {
      console.error('libsql batch failed, falling back', err && err.message);
    }
    const out = [];
    for (const st of statements) {
      const rs = await st.exec();
      out.push({
        success: true,
        results: (rs.rows || []).map((r) => toPlain(rs.columns, r)),
        meta: { changes: Number(rs.rowsAffected || 0) },
      });
    }
    return out;
  }

  async exec(sql) {
    await this.client.executeMultiple(sql);
    return { count: 0, duration: 0 };
  }
}

export function createD1({ url, authToken }) {
  if (!url) {
    throw new Error('متغیر محیطی TURSO_DATABASE_URL تنظیم نشده است.');
  }
  const client = createClient({ url, authToken: authToken || undefined });
  return new D1(client);
}
