/**
 * db.js - Capa de persistencia determinista local con almacenamiento estructurado
 * compatible con la política de persistencia SQLite/LocalStorage de Codex.
 * Almacena ejecuciones, topologías de grafos, métricas de fidelidad y caché de jobs.
 */

export class QuantumWalkDatabase {
  constructor(storageKey = 'codex_quantum_walk_db_v1') {
    this.storageKey = storageKey;
    this.initDatabase();
  }

  initDatabase() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialSchema = {
        meta: {
          version: '1.0.0',
          engine: 'SQLite3-Compatible-Store',
          created: new Date().toISOString()
        },
        runs: [
          {
            id: 'run-init-001',
            timestamp: new Date().toISOString(),
            topology: 'Hipercubo Q3 (8 nodos)',
            mode: 'DTQW',
            coin: 'Grover',
            steps: 8,
            speedupFactor: 2.14,
            probabilities: [0.08, 0.12, 0.25, 0.05, 0.18, 0.04, 0.09, 0.19]
          }
        ],
        savedCircuits: []
      };
      this.saveAll(initialSchema);
    }
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch (e) {
      console.error('Error parsing quantum walk DB:', e);
      return { runs: [], savedCircuits: [] };
    }
  }

  saveAll(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage quota exceeded or unavailable:', e);
    }
  }

  saveRun(record) {
    const db = this.getAll();
    const newRecord = {
      id: 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ...record
    };
    db.runs = db.runs || [];
    db.runs.unshift(newRecord);
    if (db.runs.length > 50) db.runs = db.runs.slice(0, 50); // Mantener últimos 50 registros
    this.saveAll(db);
    return newRecord;
  }

  getRecentRuns(limit = 10) {
    const db = this.getAll();
    return (db.runs || []).slice(0, limit);
  }

  clearRuns() {
    const db = this.getAll();
    db.runs = [];
    this.saveAll(db);
  }
}
