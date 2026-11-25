/**
 * problem-engine.js - Modelado de grafos, simulación DTQW y CTQW,
 * caminata clásica de difusión, y algoritmos de inteligencia de grafos cuántica.
 */

import { Complex, StateVector, ComplexMatrix, QuantumCoins, matrixExpMinusI } from './quantum-math.js';

export class GraphTopology {
  constructor(name, nodes = [], edges = []) {
    this.name = name;
    this.nodes = nodes; // [{ id: 0, label: '0', x, y }, ...]
    this.edges = edges; // [[u, v], ...]
    this.adj = new Map();
    this.buildAdjacency();
  }

  buildAdjacency() {
    this.adj.clear();
    for (let node of this.nodes) {
      this.adj.set(node.id, []);
    }
    for (let [u, v] of this.edges) {
      if (this.adj.has(u) && !this.adj.get(u).includes(v)) {
        this.adj.get(u).push(v);
      }
      if (this.adj.has(v) && !this.adj.get(v).includes(u)) {
        this.adj.get(v).push(u);
      }
    }
    // Sort adjacency for deterministic indexing
    for (let [k, list] of this.adj.entries()) {
      list.sort((a, b) => a - b);
    }
  }

  getDegree(nodeId) {
    return (this.adj.get(nodeId) || []).length;
  }

  getMaxDegree() {
    let max = 0;
    for (let node of this.nodes) {
      max = Math.max(max, this.getDegree(node.id));
    }
    return max;
  }

  getAdjacencyMatrix() {
    const n = this.nodes.length;
    const m = ComplexMatrix.zeros(n, n);
    for (let [u, v] of this.edges) {
      m.set(u, v, Complex.one());
      m.set(v, u, Complex.one());
    }
    return m;
  }

  getLaplacianMatrix() {
    const n = this.nodes.length;
    const m = ComplexMatrix.zeros(n, n);
    for (let i = 0; i < n; i++) {
      const deg = this.getDegree(i);
      m.set(i, i, new Complex(deg, 0));
    }
    for (let [u, v] of this.edges) {
      m.set(u, v, new Complex(-1, 0));
      m.set(v, u, new Complex(-1, 0));
    }
    return m;
  }
}

/**
 * Creador de Topologías de Grafos de Estudio
 */
export const TopologyFactory = {
  // Línea 1D de N nodos
  createLine: (n = 15) => {
    const nodes = [];
    const edges = [];
    const spacing = 600 / (n - 1);
    for (let i = 0; i < n; i++) {
      nodes.push({ id: i, label: `${i}`, x: 80 + i * spacing, y: 220 });
      if (i > 0) edges.push([i - 1, i]);
    }
    return new GraphTopology('Línea 1D', nodes, edges);
  },

  // Ciclo / Anillo de N nodos
  createCycle: (n = 16) => {
    const nodes = [];
    const edges = [];
    const cx = 380, cy = 220, r = 160;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      nodes.push({
        id: i,
        label: `${i}`,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
      edges.push([i, (i + 1) % n]);
    }
    return new GraphTopology('Ciclo (Anillo)', nodes, edges);
  },

  // Hipercubo Booleano d-dimensional (ej: d=3 -> 8 nodos, d=4 -> 16 nodos)
  createHypercube: (d = 4) => {
    const n = Math.pow(2, d);
    const nodes = [];
    const edges = [];
    const cx = 380, cy = 220;

    for (let i = 0; i < n; i++) {
      // Coordenadas proyectadas
      let x = cx;
      let y = cy;
      const bitString = i.toString(2).padStart(d, '0');
      
      // Proyección isométrica n-dimensional
      const rInner = 80;
      const rOuter = 170;
      const isOuter = (i >> (d - 1)) & 1;
      const subIdx = i % (n / 2);
      const subAngle = (2 * Math.PI * subIdx) / (n / 2) - Math.PI / 2;
      const rad = isOuter ? rOuter : rInner;

      x = cx + rad * Math.cos(subAngle);
      y = cy + rad * Math.sin(subAngle);

      nodes.push({ id: i, label: bitString, x, y });
    }

    // Aristas donde solo difieren en 1 bit
    for (let i = 0; i < n; i++) {
      for (let bit = 0; bit < d; bit++) {
        const j = i ^ (1 << bit);
        if (i < j) {
          edges.push([i, j]);
        }
      }
    }

    return new GraphTopology(`Hipercubo Q${d} (${n} nodos)`, nodes, edges);
  },

  // Glued Trees (Árboles Binarios Pegados) - Benchmark de aceleración cuántica exponencial
  createGluedTrees: (depth = 3) => {
    const nodes = [];
    const edges = [];
    let idCounter = 0;

    // Generar árbol izquierdo
    const leftLevels = [];
    for (let l = 0; l <= depth; l++) {
      const count = Math.pow(2, l);
      const levelNodes = [];
      for (let c = 0; c < count; c++) {
        levelNodes.push(idCounter++);
      }
      leftLevels.push(levelNodes);
    }

    // Generar árbol derecho (espejo)
    const rightLevels = [];
    for (let l = depth; l >= 0; l--) {
      const count = Math.pow(2, l);
      const levelNodes = [];
      for (let c = 0; c < count; c++) {
        levelNodes.push(idCounter++);
      }
      rightLevels.push(levelNodes);
    }

    // Aristas árbol izquierdo
    for (let l = 0; l < depth; l++) {
      const parents = leftLevels[l];
      const children = leftLevels[l + 1];
      for (let i = 0; i < parents.length; i++) {
        edges.push([parents[i], children[2 * i]]);
        edges.push([parents[i], children[2 * i + 1]]);
      }
    }

    // Pegamento central (intercalado aleatorio/bipartito entre hojas)
    const leavesLeft = leftLevels[depth];
    const leavesRight = rightLevels[0];
    const m = leavesLeft.length;
    for (let i = 0; i < m; i++) {
      edges.push([leavesLeft[i], leavesRight[i]]);
      edges.push([leavesLeft[i], leavesRight[(i + 1) % m]]);
    }

    // Aristas árbol derecho
    for (let l = 0; l < depth; l++) {
      const parents = rightLevels[l];
      const children = rightLevels[l + 1];
      for (let i = 0; i < children.length; i++) {
        edges.push([parents[2 * i], children[i]]);
        edges.push([parents[2 * i + 1], children[i]]);
      }
    }

    // Posicionamiento de nodos visualmente armónico
    const totalCols = (depth * 2) + 2;
    const colSpacing = 680 / (totalCols - 1);
    const startX = 60;

    // Asignar coordenadas a niveles
    const allLevels = [...leftLevels, ...rightLevels];
    allLevels.forEach((level, colIdx) => {
      const x = startX + colIdx * colSpacing;
      const count = level.length;
      const stepY = 360 / (count + 1);
      level.forEach((nodeId, rowIdx) => {
        nodes.push({
          id: nodeId,
          label: nodeId === 0 ? 'ENTRADA' : (nodeId === idCounter - 1 ? 'SALIDA' : `${nodeId}`),
          x,
          y: 40 + (rowIdx + 1) * stepY
        });
      });
    });

    nodes.sort((a, b) => a.id - b.id);
    return new GraphTopology(`Árboles Pegados (Glued Trees d=${depth})`, nodes, edges);
  },

  // Red Barabási-Albert Libre de Escala (Scale-free network)
  createBarabasiAlbert: (n = 18, m0 = 3, m = 2) => {
    const nodes = [];
    const edges = [];

    // Semilla inicial conectada
    for (let i = 0; i < m0; i++) {
      nodes.push({ id: i, label: `${i}`, x: 0, y: 0 });
      for (let j = 0; j < i; j++) {
        edges.push([j, i]);
      }
    }

    // Apego preferencial
    const degrees = [];
    for (let [u, v] of edges) {
      degrees.push(u);
      degrees.push(v);
    }

    for (let i = m0; i < n; i++) {
      nodes.push({ id: i, label: `${i}`, x: 0, y: 0 });
      const targets = new Set();
      let attempts = 0;
      while (targets.size < m && attempts < 100) {
        attempts++;
        const randIdx = Math.floor(Math.random() * degrees.length);
        const candidate = degrees[randIdx];
        if (candidate !== i) targets.add(candidate);
      }
      for (let t of targets) {
        edges.push([t, i]);
        degrees.push(t);
        degrees.push(i);
      }
    }

    // Layout circular concéntrico con perturbación de fuerza
    const cx = 380, cy = 220;
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = 110 + (i % 3) * 45;
      node.x = cx + r * Math.cos(angle);
      node.y = cy + r * Math.sin(angle);
    });

    return new GraphTopology(`Barabási-Albert Libre de Escala (N=${n})`, nodes, edges);
  }
};

/**
 * Simulador de Caminata Aleatoria Clásica (Browniana / Markov)
 * p(t+1) = M * p(t), donde M_ij = A_ij / deg(j)
 */
export class ClassicalRandomWalk {
  constructor(graph, startNode = 0) {
    this.graph = graph;
    this.startNode = startNode;
    this.numNodes = graph.nodes.length;
    this.prob = new Array(this.numNodes).fill(0);
    this.prob[startNode] = 1.0;
    this.stepCount = 0;
    this.history = [[...this.prob]];
  }

  reset(startNode = this.startNode) {
    this.startNode = startNode;
    this.prob = new Array(this.numNodes).fill(0);
    this.prob[startNode] = 1.0;
    this.stepCount = 0;
    this.history = [[...this.prob]];
  }

  step() {
    const nextProb = new Array(this.numNodes).fill(0);
    for (let u = 0; u < this.numNodes; u++) {
      const p = this.prob[u];
      if (p <= 0) continue;
      const neighbors = this.graph.adj.get(u) || [];
      if (neighbors.length === 0) {
        nextProb[u] += p;
      } else {
        const share = p / neighbors.length;
        for (let v of neighbors) {
          nextProb[v] += share;
        }
      }
    }
    this.prob = nextProb;
    this.stepCount++;
    this.history.push([...this.prob]);
    return this.prob;
  }
}

/**
 * Simulador de Caminata Cuántica en Tiempo Discreto (DTQW)
 * Espacio de Hilbert: H = H_coin ⊗ H_position
 * Estado: |Ψ> = sum_{c, v} alpha_{c, v} |c> ⊗ |v>
 * Operador de Paso: U = S * (C ⊗ I)
 */
export class DiscreteTimeQuantumWalk {
  constructor(graph, coinType = 'Grover', startNode = 0) {
    this.graph = graph;
    this.coinType = coinType;
    this.startNode = startNode;
    this.numNodes = graph.nodes.length;
    this.d = Math.max(2, graph.getMaxDegree()); // Dimensión de la moneda
    this.dim = this.d * this.numNodes;
    this.state = new StateVector(this.dim);
    this.stepCount = 0;
    this.markedNodes = new Set(); // Para búsqueda cuántica acelerada
    this.initCoinMatrix();
    this.reset(startNode);
  }

  initCoinMatrix() {
    if (this.coinType === 'Hadamard' && this.d === 2) {
      this.coin = QuantumCoins.Hadamard2();
    } else if (this.coinType === 'Fourier') {
      this.coin = QuantumCoins.Fourier(this.d);
    } else {
      this.coin = QuantumCoins.Grover(this.d);
    }
  }

  setCoinType(type) {
    this.coinType = type;
    this.initCoinMatrix();
  }

  setMarkedNodes(nodesSet) {
    this.markedNodes = new Set(nodesSet);
  }

  reset(startNode = this.startNode) {
    this.startNode = startNode;
    this.stepCount = 0;
    this.state = new StateVector(this.dim);

    // Inicializar estado cuántico uniforme en los estados de la moneda para el nodo inicial
    const coinNorm = 1 / Math.sqrt(this.d);
    for (let c = 0; c < this.d; c++) {
      const idx = this.index(c, startNode);
      this.state.data[idx] = new Complex(coinNorm, 0);
    }
  }

  index(coinState, node) {
    return coinState * this.numNodes + node;
  }

  step() {
    // 1. Aplicación de la moneda con posible fase de oráculo (Búsqueda cuántica):
    // Si el nodo v está marcado, se aplica un cambio de fase pi (multiplicar por -1)
    const afterCoin = new StateVector(this.dim);

    for (let v = 0; v < this.numNodes; v++) {
      const isMarked = this.markedNodes.has(v);
      const phaseSign = isMarked ? -1 : 1;

      // Aplicar C a los estados de moneda del nodo v
      for (let c1 = 0; c1 < this.d; c1++) {
        let sum = Complex.zero();
        for (let c2 = 0; c2 < this.d; c2++) {
          const inIdx = this.index(c2, v);
          const cVal = this.coin.get(c1, c2);
          sum = sum.add(cVal.mul(this.state.data[inIdx]));
        }
        if (isMarked) {
          sum = sum.mul(phaseSign);
        }
        const outIdx = this.index(c1, v);
        afterCoin.data[outIdx] = sum;
      }
    }

    // 2. Operador de Shift condicional:
    // S |c> |v> -> |c> |vecino_c(v)>
    const nextState = new StateVector(this.dim);
    for (let v = 0; v < this.numNodes; v++) {
      const neighbors = this.graph.adj.get(v) || [];
      const deg = neighbors.length;

      for (let c = 0; c < this.d; c++) {
        const currentAmp = afterCoin.data[this.index(c, v)];
        if (currentAmp.absSq() === 0) continue;

        let targetNode;
        if (deg === 0) {
          targetNode = v;
        } else {
          targetNode = neighbors[c % deg];
        }

        const targetIdx = this.index(c, targetNode);
        nextState.data[targetIdx] = nextState.data[targetIdx].add(currentAmp);
      }
    }

    nextState.normalize();
    this.state = nextState;
    this.stepCount++;
    return this.getNodeProbabilities();
  }

  getNodeProbabilities() {
    const probs = new Array(this.numNodes).fill(0);
    for (let v = 0; v < this.numNodes; v++) {
      let sum = 0;
      for (let c = 0; c < this.d; c++) {
        sum += this.state.data[this.index(c, v)].absSq();
      }
      probs[v] = sum;
    }
    return probs;
  }
}

/**
 * Simulador de Caminata Cuántica en Tiempo Continuo (CTQW)
 * U(t) = exp(-i * H * t), donde H = Matriz de Adyacencia A o Laplaciano L
 */
export class ContinuousTimeQuantumWalk {
  constructor(graph, hamiltonianType = 'Adjacency', startNode = 0) {
    this.graph = graph;
    this.hamiltonianType = hamiltonianType;
    this.startNode = startNode;
    this.numNodes = graph.nodes.length;
    this.time = 0;
    this.markedNodes = new Set();
    this.reset(startNode);
  }

  setHamiltonianType(type) {
    this.hamiltonianType = type;
  }

  setMarkedNodes(nodesSet) {
    this.markedNodes = new Set(nodesSet);
  }

  reset(startNode = this.startNode) {
    this.startNode = startNode;
    this.time = 0;
    this.state = StateVector.basis(this.numNodes, startNode);
  }

  getHamiltonian() {
    let H = this.hamiltonianType === 'Laplacian'
      ? this.graph.getLaplacianMatrix()
      : this.graph.getAdjacencyMatrix();

    // Añadir potencial oráculo para búsqueda si hay nodos marcados: H = -gamma*A - sum |w><w|
    if (this.markedNodes.size > 0) {
      for (let marked of this.markedNodes) {
        const cur = H.get(marked, marked);
        H.set(marked, marked, cur.add(new Complex(-3.0, 0)));
      }
    }
    return H;
  }

  step(dt = 0.2) {
    const H = this.getHamiltonian();
    const U = matrixExpMinusI(H, dt);
    this.state = U.mulVec(this.state).normalize();
    this.time += dt;
    return this.getNodeProbabilities();
  }

  getNodeProbabilities() {
    return this.state.getProbabilities();
  }
}

/**
 * Módulo de Inteligencia de Grafos Cuántica:
 * Centralidad Cuántica, Detección de Comunidades por Interferencia y Coherencia
 */
export class QuantumGraphIntelligence {
  /**
   * Centralidad Cuántica de Caminata (Quantum Walk Centrality)
   * Mide la persistencia de probabilidad y coherencia cuántica a lo largo de pasos t
   */
  static computeCentrality(graph, steps = 12) {
    const n = graph.nodes.length;
    const centrality = new Array(n).fill(0);

    for (let start = 0; start < n; start++) {
      const qwalk = new DiscreteTimeQuantumWalk(graph, 'Grover', start);
      for (let t = 0; t < steps; t++) {
        const probs = qwalk.step();
        for (let i = 0; i < n; i++) {
          centrality[i] += probs[i] / (steps * n);
        }
      }
    }

    // Normalizar a rango [0, 1]
    const maxVal = Math.max(...centrality, 1e-9);
    return centrality.map(c => c / maxVal);
  }

  /**
   * Detección de Comunidades vía Fase e Interferencia Cuántica
   * Agrupa nodos según la similitud en la distribución de amplitudes cuánticas
   */
  static detectCommunities(graph, k = 2) {
    const n = graph.nodes.length;
    const ctqw = new ContinuousTimeQuantumWalk(graph, 'Adjacency', 0);
    // Evolucionar hasta t = 2.5
    for (let i = 0; i < 10; i++) ctqw.step(0.25);
    const probs = ctqw.getNodeProbabilities();

    // Clustering k-means unidimensional sobre amplitudes acumuladas
    const assignments = new Array(n).fill(0);
    const centroids = [Math.min(...probs), Math.max(...probs)];
    if (k > 2) {
      for (let i = 2; i < k; i++) centroids.push(centroids[0] + (centroids[1] - centroids[0]) * (i / k));
    }

    for (let iter = 0; iter < 10; iter++) {
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestC = 0;
        centroids.forEach((c, idx) => {
          const d = Math.abs(probs[i] - c);
          if (d < minDist) {
            minDist = d;
            bestC = idx;
          }
        });
        assignments[i] = bestC;
      }
    }

    return {
      assignments,
      numCommunities: k,
      probabilities: probs
    };
  }
}
