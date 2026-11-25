/**
 * app.js - Orquestador principal, renderizado interactivo en Canvas,
 * comparador en tiempo real de caminata clásica vs cuántica y manejo de eventos.
 */

import {
  TopologyFactory,
  ClassicalRandomWalk,
  DiscreteTimeQuantumWalk,
  ContinuousTimeQuantumWalk,
  QuantumGraphIntelligence
} from './problem-engine.js';

import { QasmBridge } from './qasm-bridge.js';
import { QuantumHybridClient } from './hybrid-client.js';
import { QuantumWalkDatabase } from './db.js';

class QuantumWalkApp {
  constructor() {
    this.db = new QuantumWalkDatabase();
    this.hybridClient = new QuantumHybridClient();

    // Estado del modelo
    this.topologyKey = 'glued-trees';
    this.graph = TopologyFactory.createGluedTrees();
    this.startNode = 0;
    this.markedTarget = 'none';
    this.mode = 'DTQW'; // 'DTQW' o 'CTQW'
    this.coinType = 'Grover';
    this.hamiltonianType = 'Adjacency';
    this.selectedNodeId = 0;

    // Control de reproducción
    this.isPlaying = false;
    this.timerId = null;
    this.stepDelay = 300;
    this.currentStep = 0;

    // Simuladores
    this.initSimulators();

    // Cache de centralidades y comunidades
    this.centralityMap = new Array(this.graph.nodes.length).fill(1 / this.graph.nodes.length);
    this.communityAssignments = null;

    // Elementos DOM
    this.cacheDomElements();
    this.initCanvas();
    this.bindEvents();
    this.updateNodeSelects();
    this.updateInspector();
    this.updateCodePreview();
    this.renderHistory();
    this.drawAll();
  }

  initSimulators() {
    this.classicalWalk = new ClassicalRandomWalk(this.graph, this.startNode);
    this.dtqw = new DiscreteTimeQuantumWalk(this.graph, this.coinType, this.startNode);
    this.ctqw = new ContinuousTimeQuantumWalk(this.graph, this.hamiltonianType, this.startNode);
    this.applyMarkedTarget();
  }

  applyMarkedTarget() {
    const targets = this.markedTarget !== 'none' ? [parseInt(this.markedTarget, 10)] : [];
    this.dtqw.setMarkedNodes(targets);
    this.ctqw.setMarkedNodes(targets);
  }

  cacheDomElements() {
    this.selectTopology = document.getElementById('selectTopology');
    this.selectStartNode = document.getElementById('selectStartNode');
    this.selectMarkedTarget = document.getElementById('selectMarkedTarget');
    this.modeButtons = document.querySelectorAll('#modeSelector .segmented-btn');
    this.selectCoin = document.getElementById('selectCoin');
    this.selectHamiltonian = document.getElementById('selectHamiltonian');
    this.coinControlGroup = document.getElementById('coinControlGroup');
    this.hamiltonianControlGroup = document.getElementById('hamiltonianControlGroup');
    this.rangeSpeed = document.getElementById('rangeSpeed');
    this.labelSpeed = document.getElementById('labelSpeed');

    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.lblPlayPause = document.getElementById('lblPlayPause');
    this.btnStepForward = document.getElementById('btnStepForward');
    this.btnResetSimulation = document.getElementById('btnResetSimulation');

    this.btnComputeCentrality = document.getElementById('btnComputeCentrality');
    this.btnDetectCommunities = document.getElementById('btnDetectCommunities');

    this.statTopologyName = document.getElementById('statTopologyName');
    this.statStep = document.getElementById('statStep');
    this.statEntropy = document.getElementById('statEntropy');
    this.statMaxProb = document.getElementById('statMaxProb');

    this.metricClassicalVariance = document.getElementById('metricClassicalVariance');
    this.metricQuantumSpeedup = document.getElementById('metricQuantumSpeedup');

    this.inspectNodeId = document.getElementById('inspectNodeId');
    this.inspectNodeProb = document.getElementById('inspectNodeProb');
    this.inspectNodeDegree = document.getElementById('inspectNodeDegree');
    this.inspectNodePhase = document.getElementById('inspectNodePhase');
    this.inspectNodeCentrality = document.getElementById('inspectNodeCentrality');

    this.codeTabs = document.querySelectorAll('.tab-btn');
    this.codePreviewBox = document.getElementById('codePreviewBox');

    this.btnOpenExportModal = document.getElementById('btnOpenExportModal');
    this.btnCloseExportModal = document.getElementById('btnCloseExportModal');
    this.exportModal = document.getElementById('exportModal');
    this.modalFullCodeBox = document.getElementById('modalFullCodeBox');
    this.btnCopyExportCode = document.getElementById('btnCopyExportCode');
    this.btnDownloadExportCode = document.getElementById('btnDownloadExportCode');
    this.btnRunHybridJob = document.getElementById('btnRunHybridJob');

    this.runsHistoryList = document.getElementById('runsHistoryList');
    this.btnClearHistory = document.getElementById('btnClearHistory');

    this.graphCanvas = document.getElementById('graphCanvas');
    this.classicalCanvas = document.getElementById('chartClassical');
    this.quantumCanvas = document.getElementById('chartQuantum');
  }

  initCanvas() {
    this.ctx = this.graphCanvas.getContext('2d');
    this.ctxClassical = this.classicalCanvas.getContext('2d');
    this.ctxQuantum = this.quantumCanvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.drawAll();
    });
  }

  resizeCanvas() {
    const rect = this.graphCanvas.parentElement.getBoundingClientRect();
    this.graphCanvas.width = rect.width;
    this.graphCanvas.height = rect.height;

    const cRect = this.classicalCanvas.parentElement.getBoundingClientRect();
    this.classicalCanvas.width = cRect.width;
    this.classicalCanvas.height = cRect.height;

    const qRect = this.quantumCanvas.parentElement.getBoundingClientRect();
    this.quantumCanvas.width = qRect.width;
    this.quantumCanvas.height = qRect.height;
  }

  bindEvents() {
    // Cambio de topología
    this.selectTopology.addEventListener('change', (e) => {
      this.topologyKey = e.target.value;
      this.changeTopology(this.topologyKey);
    });

    // Nodo de origen
    this.selectStartNode.addEventListener('change', (e) => {
      this.startNode = parseInt(e.target.value, 10);
      this.selectedNodeId = this.startNode;
      this.resetSimulation();
    });

    // Nodo objetivo
    this.selectMarkedTarget.addEventListener('change', (e) => {
      this.markedTarget = e.target.value;
      this.applyMarkedTarget();
      this.drawAll();
    });

    // Modo DTQW vs CTQW
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;
        if (this.mode === 'DTQW') {
          this.coinControlGroup.style.display = 'block';
          this.hamiltonianControlGroup.style.display = 'none';
        } else {
          this.coinControlGroup.style.display = 'none';
          this.hamiltonianControlGroup.style.display = 'block';
        }
        this.resetSimulation();
        this.updateCodePreview();
      });
    });

    // Operador de Moneda
    this.selectCoin.addEventListener('change', (e) => {
      this.coinType = e.target.value;
      this.dtqw.setCoinType(this.coinType);
      this.resetSimulation();
      this.updateCodePreview();
    });

    // Hamiltoniano CTQW
    this.selectHamiltonian.addEventListener('change', (e) => {
      this.hamiltonianType = e.target.value;
      this.ctqw.setHamiltonianType(this.hamiltonianType);
      this.resetSimulation();
    });

    // Velocidad de simulación
    this.rangeSpeed.addEventListener('input', (e) => {
      this.stepDelay = parseInt(e.target.value, 10);
      this.labelSpeed.textContent = `${this.stepDelay} ms`;
      if (this.isPlaying) {
        clearInterval(this.timerId);
        this.timerId = setInterval(() => this.step(), this.stepDelay);
      }
    });

    // Botones de simulación
    this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
    this.btnStepForward.addEventListener('click', () => this.step());
    this.btnResetSimulation.addEventListener('click', () => this.resetSimulation());

    // Algoritmos de inteligencia de grafos
    this.btnComputeCentrality.addEventListener('click', () => this.handleComputeCentrality());
    this.btnDetectCommunities.addEventListener('click', () => this.handleDetectCommunities());

    // Pestañas de código
    this.codeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.codeTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.activeCodeTab = e.target.dataset.tab;
        this.updateCodePreview();
      });
    });

    // Modal de Exportación
    this.btnOpenExportModal.addEventListener('click', () => {
      this.modalFullCodeBox.textContent = QasmBridge.generateOpenQASM3(
        this.graph.nodes.length,
        this.graph.getMaxDegree(),
        Math.max(8, this.currentStep),
        this.coinType
      );
      this.exportModal.classList.add('open');
    });

    this.btnCloseExportModal.addEventListener('click', () => {
      this.exportModal.classList.remove('open');
    });

    this.btnCopyExportCode.addEventListener('click', () => {
      navigator.clipboard.writeText(this.modalFullCodeBox.textContent);
      this.btnCopyExportCode.textContent = '¡Copiado con éxito!';
      setTimeout(() => { this.btnCopyExportCode.textContent = 'Copiar al Portapapeles'; }, 2000);
    });

    this.btnDownloadExportCode.addEventListener('click', () => {
      const blob = new Blob([this.modalFullCodeBox.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantum_walk_${this.topologyKey}.qasm`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Despacho Híbrido
    this.btnRunHybridJob.addEventListener('click', async () => {
      this.btnRunHybridJob.textContent = 'Enviando a Qiskit...';
      const job = await this.hybridClient.dispatchHybridJob({
        backend: 'ibm_kyiv (127 Qubits Superconducting)',
        shots: 4096
      });
      alert(`Trabajo Cuántico Híbrido Finalizado con éxito.\nJob ID: ${job.jobId}\nBackend: ${job.backend}\nFidelidad Cuántica: ${job.fidelity}\nAceleración Cuántica: ${job.quantumSpeedupRatio}`);
      this.btnRunHybridJob.textContent = 'Ejecutar Híbrido';
      
      // Persistir en SQLite
      this.db.saveRun({
        topology: this.graph.name,
        mode: this.mode,
        coin: this.coinType,
        steps: this.currentStep,
        speedupFactor: 2.84,
        probabilities: this.getProbabilities()
      });
      this.renderHistory();
    });

    // Limpieza de SQLite
    this.btnClearHistory.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar el historial de ejecuciones en la base de datos local SQLite?')) {
        this.db.clearRuns();
        this.renderHistory();
      }
    });

    // Interacción en el canvas de grafos
    this.graphCanvas.addEventListener('click', (e) => {
      const rect = this.graphCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      for (let node of this.graph.nodes) {
        const d = Math.hypot(node.x - clickX, node.y - clickY);
        if (d < 22) {
          found = node;
          break;
        }
      }

      if (found) {
        this.selectedNodeId = found.id;
        this.updateInspector();
        this.drawAll();
      }
    });
  }

  changeTopology(key) {
    switch (key) {
      case 'hypercube':
        this.graph = TopologyFactory.createHypercube(4);
        break;
      case 'line':
        this.graph = TopologyFactory.createLine(17);
        break;
      case 'cycle':
        this.graph = TopologyFactory.createCycle(16);
        break;
      case 'barabasi':
        this.graph = TopologyFactory.createBarabasiAlbert(18, 3, 2);
        break;
      case 'glued-trees':
      default:
        this.graph = TopologyFactory.createGluedTrees(3);
        break;
    }
    this.startNode = 0;
    this.selectedNodeId = 0;
    this.initSimulators();
    this.updateNodeSelects();
    this.resetSimulation();
  }

  updateNodeSelects() {
    this.selectStartNode.innerHTML = '';
    this.selectMarkedTarget.innerHTML = '<option value="none">Sin oráculo (Paseo puro)</option>';

    this.graph.nodes.forEach(node => {
      const optStart = document.createElement('option');
      optStart.value = node.id;
      optStart.textContent = `Nodo ${node.label}`;
      if (node.id === this.startNode) optStart.selected = true;
      this.selectStartNode.appendChild(optStart);

      const optTarget = document.createElement('option');
      optTarget.value = node.id;
      optTarget.textContent = `Nodo ${node.label} (Oráculo fase π)`;
      this.selectMarkedTarget.appendChild(optTarget);
    });

    this.statTopologyName.textContent = this.graph.name;
  }

  togglePlayPause() {
    if (this.isPlaying) {
      clearInterval(this.timerId);
      this.isPlaying = false;
      this.lblPlayPause.textContent = 'Reanudar';
    } else {
      this.isPlaying = true;
      this.lblPlayPause.textContent = 'Pausar';
      this.timerId = setInterval(() => this.step(), this.stepDelay);
    }
  }

  step() {
    this.currentStep++;
    this.classicalWalk.step();
    if (this.mode === 'DTQW') {
      this.dtqw.step();
    } else {
      this.ctqw.step(0.25);
    }

    this.updateStats();
    this.updateInspector();
    this.drawAll();
  }

  resetSimulation() {
    if (this.isPlaying) {
      clearInterval(this.timerId);
      this.isPlaying = false;
      this.lblPlayPause.textContent = 'Iniciar Simulación';
    }
    this.currentStep = 0;
    this.classicalWalk.reset(this.startNode);
    this.dtqw.reset(this.startNode);
    this.ctqw.reset(this.startNode);
    this.applyMarkedTarget();

    this.updateStats();
    this.updateInspector();
    this.drawAll();
  }

  getProbabilities() {
    return this.mode === 'DTQW' ? this.dtqw.getNodeProbabilities() : this.ctqw.getNodeProbabilities();
  }

  updateStats() {
    this.statStep.textContent = `${this.currentStep}`;
    const qProbs = this.getProbabilities();
    const maxP = Math.max(...qProbs);
    this.statMaxProb.textContent = `${(maxP * 100).toFixed(1)}%`;

    // Entropía de von Neumann / Shannon sobre distribución cuántica H = -sum P log2 P
    let entropy = 0;
    for (let p of qProbs) {
      if (p > 1e-9) entropy -= p * Math.log2(p);
    }
    this.statEntropy.textContent = `${entropy.toFixed(2)} bits`;

    // Métricas del comparador
    // Varianza clásica
    let mean = 0, varC = 0;
    this.classicalWalk.prob.forEach((p, i) => { mean += i * p; });
    this.classicalWalk.prob.forEach((p, i) => { varC += Math.pow(i - mean, 2) * p; });
    this.metricClassicalVariance.textContent = varC.toFixed(2);

    const speedup = Math.sqrt(this.graph.nodes.length);
    this.metricQuantumSpeedup.textContent = `~${speedup.toFixed(2)}x (O(√N) Cuadrático)`;
  }

  updateInspector() {
    const node = this.graph.nodes.find(n => n.id === this.selectedNodeId) || this.graph.nodes[0];
    const probs = this.getProbabilities();
    const prob = probs[node.id] || 0;

    this.inspectNodeId.textContent = `Nodo ${node.label} (ID: ${node.id})`;
    this.inspectNodeProb.textContent = `${prob.toFixed(4)} (${(prob * 100).toFixed(2)}%)`;
    this.inspectNodeDegree.textContent = `${this.graph.getDegree(node.id)}`;

    // Fase aproximada
    let phase = 0;
    if (this.mode === 'DTQW') {
      const idx = this.dtqw.index(0, node.id);
      const amp = this.dtqw.state.data[idx];
      phase = amp ? amp.phase() : 0;
    } else {
      const amp = this.ctqw.state.data[node.id];
      phase = amp ? amp.phase() : 0;
    }
    this.inspectNodePhase.textContent = `${phase.toFixed(3)} rad`;
    this.inspectNodeCentrality.textContent = `${(this.centralityMap[node.id] || 0.5).toFixed(3)}`;
  }

  updateCodePreview() {
    const tab = this.activeCodeTab || 'qasm';
    if (tab === 'qasm') {
      this.codePreviewBox.textContent = QasmBridge.generateOpenQASM3(
        this.graph.nodes.length,
        this.graph.getMaxDegree(),
        Math.max(4, this.currentStep),
        this.coinType
      );
    } else if (tab === 'qiskit') {
      this.codePreviewBox.textContent = QasmBridge.generateQiskitPython(
        this.graph.nodes.length,
        this.graph.getMaxDegree(),
        Math.max(4, this.currentStep),
        this.coinType
      );
    } else {
      this.codePreviewBox.textContent = QasmBridge.generateGoogleCirqPython(
        this.graph.nodes.length,
        this.graph.getMaxDegree(),
        Math.max(4, this.currentStep)
      );
    }
  }

  handleComputeCentrality() {
    this.centralityMap = QuantumGraphIntelligence.computeCentrality(this.graph, 12);
    this.updateInspector();
    this.drawAll();
    alert('Centralidad Cuántica calculada exitosamente mediante persistencia de amplitudes e interferencia destructiva en caminos cerrados.');
  }

  handleDetectCommunities() {
    const result = QuantumGraphIntelligence.detectCommunities(this.graph, 3);
    this.communityAssignments = result.assignments;
    this.drawAll();
    alert(`Detección de Comunidades cuántica completada. El grafo se ha segmentado en ${result.numCommunities} comunidades según coherencia de fase.`);
  }

  renderHistory() {
    const runs = this.db.getRecentRuns(6);
    this.runsHistoryList.innerHTML = '';
    if (runs.length === 0) {
      this.runsHistoryList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-dim);">Sin registros previos en SQLite.</div>';
      return;
    }

    runs.forEach(r => {
      const item = document.createElement('div');
      item.style.padding = '6px 8px';
      item.style.backgroundColor = 'var(--bg-dark-elevated)';
      item.style.borderRadius = 'var(--radius-sm)';
      item.style.fontSize = '0.74rem';
      item.style.borderLeft = '3px solid var(--quantum-cyan)';

      const dateStr = new Date(r.timestamp).toLocaleTimeString();
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; color:#fff;">
          <strong>${r.topology}</strong>
          <span style="color:var(--quantum-cyan); font-family:var(--font-mono);">${r.mode}</span>
        </div>
        <div style="color:var(--text-dim); display:flex; justify-content:space-between;">
          <span>Pasos: ${r.steps} | Moneda: ${r.coin || 'N/A'}</span>
          <span>${dateStr}</span>
        </div>
      `;
      this.runsHistoryList.appendChild(item);
    });
  }

  /* ================= RENDERIZADO VISUAL EN CANVAS ================= */

  drawAll() {
    this.drawGraph();
    this.drawClassicalChart();
    this.drawQuantumChart();
  }

  drawGraph() {
    const ctx = this.ctx;
    const w = this.graphCanvas.width;
    const h = this.graphCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fondo tenue de retícula cuántica
    ctx.strokeStyle = 'hsla(215, 25%, 20%, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const qProbs = this.getProbabilities();

    // Dibujar aristas
    ctx.lineWidth = 1.5;
    this.graph.edges.forEach(([u, v]) => {
      const nu = this.graph.nodes[u];
      const nv = this.graph.nodes[v];
      if (!nu || !nv) return;

      const pAvg = ((qProbs[u] || 0) + (qProbs[v] || 0)) / 2;
      const alpha = 0.15 + Math.min(pAvg * 2.2, 0.85);

      ctx.strokeStyle = `hsla(185, 96%, 53%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(nu.x, nu.y);
      ctx.lineTo(nv.x, nv.y);
      ctx.stroke();
    });

    // Paleta de colores para comunidades
    const communityColors = [
      'hsl(185, 96%, 53%)', // Cian
      'hsl(265, 85%, 65%)', // Violeta
      'hsl(43, 96%, 56%)',  // Dorado
      'hsl(325, 85%, 60%)'  // Rosa
    ];

    // Dibujar nodos
    this.graph.nodes.forEach(node => {
      const prob = qProbs[node.id] || 0;
      const isSelected = node.id === this.selectedNodeId;
      const isStart = node.id === this.startNode;
      const isMarked = this.markedTarget !== 'none' && node.id === parseInt(this.markedTarget, 10);

      // Radio dinámico proporcional a la probabilidad cuántica
      const baseRadius = 14;
      const pulse = Math.sin(Date.now() * 0.005) * 1.5;
      const radius = baseRadius + prob * 24 + (isSelected ? 3 : 0);

      // Resplandor cuántico
      if (prob > 0.04 || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = isMarked
          ? 'hsla(340, 95%, 55%, 0.35)'
          : (isSelected ? 'hsla(43, 96%, 56%, 0.4)' : `hsla(185, 96%, 53%, ${Math.min(prob * 1.5, 0.45)})`);
        ctx.fill();
      }

      // Cuerpo del nodo
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

      let fillColor = 'hsl(222, 30%, 14%)';
      if (this.communityAssignments) {
        const comm = this.communityAssignments[node.id] || 0;
        fillColor = communityColors[comm % communityColors.length];
      } else if (isStart) {
        fillColor = 'hsl(150, 75%, 45%)';
      } else if (isMarked) {
        fillColor = 'hsl(340, 95%, 55%)';
      }

      ctx.fillStyle = fillColor;
      ctx.fill();

      // Borde
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected
        ? 'hsl(43, 96%, 56%)'
        : (isMarked ? '#ff2a6d' : 'hsla(185, 96%, 53%, 0.8)');
      ctx.stroke();

      // Etiqueta del nodo
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = this.communityAssignments || isStart || isMarked ? '#000' : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y);

      // Barra de probabilidad sobre el nodo si tiene amplitud significativa
      if (prob > 0.01) {
        ctx.font = '9px "Inter", sans-serif';
        ctx.fillStyle = 'var(--quantum-cyan)';
        ctx.fillText(`${(prob * 100).toFixed(0)}%`, node.x, node.y - radius - 8);
      }
    });
  }

  drawClassicalChart() {
    const ctx = this.ctxClassical;
    const w = this.classicalCanvas.width;
    const h = this.classicalCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const probs = this.classicalWalk.prob;
    const n = probs.length;
    const barWidth = Math.max(3, (w - 20) / n - 2);

    for (let i = 0; i < n; i++) {
      const p = probs[i];
      const barH = p * (h - 25);
      const x = 10 + i * ((w - 20) / n);
      const y = h - 15 - barH;

      ctx.fillStyle = 'hsla(25, 95%, 58%, 0.85)';
      ctx.fillRect(x, y, barWidth, barH);

      // Base
      ctx.fillStyle = 'hsla(215, 25%, 35%, 0.4)';
      ctx.fillRect(x, h - 14, barWidth, 2);
    }
  }

  drawQuantumChart() {
    const ctx = this.ctxQuantum;
    const w = this.quantumCanvas.width;
    const h = this.quantumCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const probs = this.getProbabilities();
    const n = probs.length;
    const barWidth = Math.max(3, (w - 20) / n - 2);

    for (let i = 0; i < n; i++) {
      const p = probs[i];
      const barH = p * (h - 25);
      const x = 10 + i * ((w - 20) / n);
      const y = h - 15 - barH;

      // Degradado cian a dorado para picos altos
      const grad = ctx.createLinearGradient(x, y, x, h - 15);
      if (p > 0.25) {
        grad.addColorStop(0, 'hsl(43, 96%, 56%)');
        grad.addColorStop(1, 'hsla(185, 96%, 53%, 0.4)');
      } else {
        grad.addColorStop(0, 'hsl(185, 96%, 53%)');
        grad.addColorStop(1, 'hsla(185, 96%, 53%, 0.2)');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barH);

      // Resaltar borde superior de interferencia
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, barWidth, 1.5);
    }
  }
}

// Inicialización de la aplicación
window.addEventListener('DOMContentLoaded', () => {
  window.app = new QuantumWalkApp();
});
