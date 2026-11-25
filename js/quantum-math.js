/**
 * quantum-math.js - Álgebra lineal compleja y operadores unitarios para Quantum Walks
 * Soporta operaciones sobre números complejos, vectores de estado, matrices unitarias,
 * producto tensorial, operadores de Pauli, exponente de matriz y traza parcial.
 */

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = Number(re) || 0;
    this.im = Number(im) || 0;
  }

  static zero() { return new Complex(0, 0); }
  static one() { return new Complex(1, 0); }
  static i() { return new Complex(0, 1); }

  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(c) {
    if (typeof c === 'number') return new Complex(this.re + c, this.im);
    return new Complex(this.re + c.re, this.im + c.im);
  }

  sub(c) {
    if (typeof c === 'number') return new Complex(this.re - c, this.im);
    return new Complex(this.re - c.re, this.im - c.im);
  }

  mul(c) {
    if (typeof c === 'number') return new Complex(this.re * c, this.im * c);
    return new Complex(
      this.re * c.re - this.im * c.im,
      this.re * c.im + this.im * c.re
    );
  }

  div(c) {
    if (typeof c === 'number') return new Complex(this.re / c, this.im / c);
    const denom = c.re * c.re + c.im * c.im;
    if (denom === 0) return new Complex(0, 0);
    return new Complex(
      (this.re * c.re + this.im * c.im) / denom,
      (this.im * c.re - this.re * c.im) / denom
    );
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  abs() {
    return Math.hypot(this.re, this.im);
  }

  absSq() {
    return this.re * this.re + this.im * this.im;
  }

  phase() {
    return Math.atan2(this.im, this.re);
  }

  exp() {
    const r = Math.exp(this.re);
    return new Complex(r * Math.cos(this.im), r * Math.sin(this.im));
  }

  clone() {
    return new Complex(this.re, this.im);
  }

  toString(decimals = 3) {
    const r = this.re.toFixed(decimals);
    const sign = this.im >= 0 ? '+' : '-';
    const imVal = Math.abs(this.im).toFixed(decimals);
    return `${r} ${sign} ${imVal}i`;
  }
}

/**
 * Representación de Vector de Estado Cuántico (Ket)
 */
export class StateVector {
  constructor(dim, data = null) {
    this.dim = dim;
    if (data) {
      this.data = data.map(d => d instanceof Complex ? d : new Complex(d, 0));
    } else {
      this.data = Array.from({ length: dim }, () => Complex.zero());
    }
  }

  static basis(dim, index) {
    const v = new StateVector(dim);
    v.data[index] = Complex.one();
    return v;
  }

  static uniform(dim) {
    const norm = 1 / Math.sqrt(dim);
    const v = new StateVector(dim);
    for (let i = 0; i < dim; i++) {
      v.data[i] = new Complex(norm, 0);
    }
    return v;
  }

  clone() {
    const v = new StateVector(this.dim);
    v.data = this.data.map(c => c.clone());
    return v;
  }

  norm() {
    let sum = 0;
    for (let i = 0; i < this.dim; i++) {
      sum += this.data[i].absSq();
    }
    return Math.sqrt(sum);
  }

  normalize() {
    const n = this.norm();
    if (n > 1e-12) {
      for (let i = 0; i < this.dim; i++) {
        this.data[i] = this.data[i].div(n);
      }
    }
    return this;
  }

  innerProduct(other) {
    let sum = Complex.zero();
    for (let i = 0; i < this.dim; i++) {
      sum = sum.add(this.data[i].conj().mul(other.data[i]));
    }
    return sum;
  }

  getProbabilities() {
    return this.data.map(c => c.absSq());
  }

  scale(factor) {
    const res = new StateVector(this.dim);
    for (let i = 0; i < this.dim; i++) {
      res.data[i] = this.data[i].mul(factor);
    }
    return res;
  }

  add(other) {
    const res = new StateVector(this.dim);
    for (let i = 0; i < this.dim; i++) {
      res.data[i] = this.data[i].add(other.data[i]);
    }
    return res;
  }
}

/**
 * Matriz Cuántica Compleja
 */
export class ComplexMatrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    if (data) {
      this.data = data.map(row =>
        row.map(cell => cell instanceof Complex ? cell : new Complex(cell, 0))
      );
    } else {
      this.data = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Complex.zero())
      );
    }
  }

  static identity(n) {
    const m = new ComplexMatrix(n, n);
    for (let i = 0; i < n; i++) {
      m.data[i][i] = Complex.one();
    }
    return m;
  }

  static zeros(rows, cols) {
    return new ComplexMatrix(rows, cols);
  }

  clone() {
    const m = new ComplexMatrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        m.data[i][j] = this.data[i][j].clone();
      }
    }
    return m;
  }

  get(r, c) {
    return this.data[r][c];
  }

  set(r, c, val) {
    this.data[r][c] = val instanceof Complex ? val : new Complex(val, 0);
  }

  add(other) {
    const res = new ComplexMatrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j].add(other.data[i][j]);
      }
    }
    return res;
  }

  scale(factor) {
    const res = new ComplexMatrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j].mul(factor);
      }
    }
    return res;
  }

  mul(other) {
    if (this.cols !== other.rows) {
      throw new Error(`Dimension mismatch in Matrix multiplication: ${this.cols} !== ${other.rows}`);
    }
    const res = new ComplexMatrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = Complex.zero();
        for (let k = 0; k < this.cols; k++) {
          sum = sum.add(this.data[i][k].mul(other.data[k][j]));
        }
        res.data[i][j] = sum;
      }
    }
    return res;
  }

  mulVec(vec) {
    if (this.cols !== vec.dim) {
      throw new Error(`Dimension mismatch: Matrix cols ${this.cols} !== Vec dim ${vec.dim}`);
    }
    const res = new StateVector(this.rows);
    for (let i = 0; i < this.rows; i++) {
      let sum = Complex.zero();
      for (let j = 0; j < this.cols; j++) {
        sum = sum.add(this.data[i][j].mul(vec.data[j]));
      }
      res.data[i] = sum;
    }
    return res;
  }

  dagger() {
    const res = new ComplexMatrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[j][i] = this.data[i][j].conj();
      }
    }
    return res;
  }

  tensor(other) {
    const r = this.rows * other.rows;
    const c = this.cols * other.cols;
    const res = new ComplexMatrix(r, c);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const a = this.data[i][j];
        for (let k = 0; k < other.rows; k++) {
          for (let l = 0; l < other.cols; l++) {
            res.data[i * other.rows + k][j * other.cols + l] = a.mul(other.data[k][l]);
          }
        }
      }
    }
    return res;
  }
}

/**
 * Operadores estándar de Moneda Cuántica (Coin Operators)
 */
export const QuantumCoins = {
  // Hadamard 2x2
  Hadamard2: () => {
    const s = 1 / Math.sqrt(2);
    return new ComplexMatrix(2, 2, [
      [new Complex(s, 0), new Complex(s, 0)],
      [new Complex(s, 0), new Complex(-s, 0)]
    ]);
  },

  // Grover Diffusion Coin de dimensión d: G_ij = 2/d - delta_ij
  Grover: (dim) => {
    const m = new ComplexMatrix(dim, dim);
    const diag = 2.0 / dim - 1.0;
    const off = 2.0 / dim;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        m.set(i, j, i === j ? diag : off);
      }
    }
    return m;
  },

  // DFT / Fourier Coin: F_jk = (1/sqrt(d)) * exp(2*pi*i*j*k/d)
  Fourier: (dim) => {
    const m = new ComplexMatrix(dim, dim);
    const norm = 1.0 / Math.sqrt(dim);
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k < dim; k++) {
        const angle = (2 * Math.PI * j * k) / dim;
        m.set(j, k, new Complex(norm * Math.cos(angle), norm * Math.sin(angle)));
      }
    }
    return m;
  },

  // Pauli X (Bit Flip)
  PauliX: () => new ComplexMatrix(2, 2, [
    [0, 1],
    [1, 0]
  ]),

  // Pauli Y
  PauliY: () => new ComplexMatrix(2, 2, [
    [0, new Complex(0, -1)],
    [new Complex(0, 1), 0]
  ]),

  // Pauli Z (Phase Flip)
  PauliZ: () => new ComplexMatrix(2, 2, [
    [1, 0],
    [0, -1]
  ])
};

/**
 * Exponenciación de matriz anti-Hermítica exp(-i * H * dt) vía serie de Taylor / Padé
 * Para Continuous-Time Quantum Walks (CTQW) U(t) = exp(-i * H * t)
 */
export function matrixExpMinusI(H, t, order = 16) {
  const n = H.rows;
  // M = -i * t * H
  const M = new ComplexMatrix(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = H.get(i, j);
      // val * (-i * t) = (val.re + i val.im) * (-i * t) = val.re*(-i*t) + val.im*t
      M.set(i, j, new Complex(val.im * t, -val.re * t));
    }
  }

  // Taylor series: sum_{k=0}^{order} M^k / k!
  let result = ComplexMatrix.identity(n);
  let term = ComplexMatrix.identity(n);

  for (let k = 1; k <= order; k++) {
    term = term.mul(M).scale(1 / k);
    result = result.add(term);
  }

  return result;
}
