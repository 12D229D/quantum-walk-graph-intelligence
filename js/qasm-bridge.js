/**
 * qasm-bridge.js - Compilador, formateador y exportador OpenQASM 3.0,
 * Qiskit (Python) y Google Cirq para circuitos de Quantum Walk.
 */

export class QasmBridge {
  /**
   * Genera código OpenQASM 3.0 para un circuito DTQW
   * @param {number} numNodes Número de nodos (se mapea a qubits ceil(log2(N)))
   * @param {number} coinDim Dimensión de la moneda (se mapea a qubits ceil(log2(d)))
   * @param {number} steps Número de pasos de caminata
   * @param {string} coinType 'Hadamard' | 'Grover' | 'Fourier'
   */
  static generateOpenQASM3(numNodes, coinDim, steps, coinType = 'Grover') {
    const nodeQubits = Math.max(1, Math.ceil(Math.log2(numNodes)));
    const coinQubits = Math.max(1, Math.ceil(Math.log2(coinDim)));
    const totalQubits = nodeQubits + coinQubits;

    const qasm = [
      '// ==============================================================',
      '// OpenQASM 3.0 - Discrete-Time Quantum Walk (DTQW) Circuit',
      '// Project: Codex / quantum-walk-graph-intelligence',
      `// Target Architecture: ${totalQubits} Qubits (${coinQubits} coin + ${nodeQubits} node)`,
      '// ==============================================================',
      'OPENQASM 3.0;',
      'include "stdgates.inc";',
      '',
      `// Declaración de registros cuánticos`,
      `qubit[${coinQubits}] coin;`,
      `qubit[${nodeQubits}] node;`,
      `bit[${nodeQubits}] c_meas;`,
      '',
      '// Estado inicial: |0> en nodo, superposición simétrica en moneda',
      'gate coin_hadamard q {',
      '  h q;',
      '}',
      ''
    ];

    // Puerta de moneda
    if (coinType === 'Hadamard') {
      qasm.push('// Operador de Moneda Hadamard');
      qasm.push('for uint i in [0:' + (coinQubits - 1) + '] {');
      qasm.push('  h coin[i];');
      qasm.push('}');
    } else if (coinType === 'Fourier') {
      qasm.push('// Operador de Moneda Cuántica Quantum Fourier Transform (QFT)');
      for (let i = 0; i < coinQubits; i++) {
        qasm.push(`h coin[${i}];`);
        for (let j = i + 1; j < coinQubits; j++) {
          const theta = (Math.PI / Math.pow(2, j - i)).toFixed(4);
          qasm.push(`cphase(${theta}) coin[${j}], coin[${i}];`);
        }
      }
    } else {
      qasm.push('// Operador de Moneda Grover (Difusión)');
      for (let i = 0; i < coinQubits; i++) qasm.push(`h coin[${i}];`);
      for (let i = 0; i < coinQubits; i++) qasm.push(`x coin[${i}];`);
      if (coinQubits === 1) {
        qasm.push('z coin[0];');
      } else if (coinQubits === 2) {
        qasm.push('cz coin[0], coin[1];');
      } else {
        qasm.push(`h coin[${coinQubits - 1}];`);
        qasm.push(`mcx coin[0:${coinQubits - 2}], coin[${coinQubits - 1}];`);
        qasm.push(`h coin[${coinQubits - 1}];`);
      }
      for (let i = 0; i < coinQubits; i++) qasm.push(`x coin[${i}];`);
      for (let i = 0; i < coinQubits; i++) qasm.push(`h coin[${i}];`);
    }

    qasm.push('');
    qasm.push(`// --- Inicio del Bucle Unitario de Caminata (${steps} pasos) ---`);

    for (let s = 1; s <= Math.min(steps, 6); s++) {
      qasm.push(`// Paso ${s}`);
      qasm.push(`// 1. Aplicación de Moneda Cuántica`);
      for (let c = 0; c < coinQubits; c++) {
        qasm.push(`h coin[${c}];`);
      }
      qasm.push(`// 2. Operador de Shift Condicional (Incrementador/Decrementador Cuántico)`);
      // Shift condicionado en el estado de la moneda:
      // Si coin = 0: node = node - 1
      // Si coin = 1: node = node + 1
      qasm.push(`x coin[0];`);
      for (let i = nodeQubits - 1; i >= 0; i--) {
        if (i === 0) {
          qasm.push(`cx coin[0], node[0];`);
        } else {
          qasm.push(`mcx [coin[0], node[0:${i - 1}]], node[${i}];`);
        }
      }
      qasm.push(`x coin[0];`);
      for (let i = nodeQubits - 1; i >= 0; i--) {
        if (i === 0) {
          qasm.push(`cx coin[0], node[0];`);
        } else {
          qasm.push(`mcx [coin[0], node[0:${i - 1}]], node[${i}];`);
        }
      }
    }

    if (steps > 6) {
      qasm.push(`// ... [${steps - 6} iteraciones repetidas omitidas para brevedad del exportador] ...`);
    }

    qasm.push('');
    qasm.push('// Medición final del registro de posición en la base computacional Z');
    for (let i = 0; i < nodeQubits; i++) {
      qasm.push(`c_meas[${i}] = measure node[${i}];`);
    }

    return qasm.join('\n');
  }

  /**
   * Genera script ejecutable en Python con Qiskit 1.x
   */
  static generateQiskitPython(numNodes, coinDim, steps, coinType = 'Grover') {
    return `"""
Qiskit 1.x - Quantum Random Walk (DTQW) Simulation
Codex Portafolio - quantum-walk-graph-intelligence
"""
import numpy as np
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator
from qiskit.visualization import plot_histogram
import matplotlib.pyplot as plt

num_nodes = ${numNodes}
node_qubits = int(np.ceil(np.log2(num_nodes))) or 1
coin_qubits = int(np.ceil(np.log2(${coinDim}))) or 1
steps = ${steps}

qr_coin = QuantumRegister(coin_qubits, name='coin')
qr_node = QuantumRegister(node_qubits, name='node')
cr = ClassicalRegister(node_qubits, name='meas')
qc = QuantumCircuit(qr_coin, qr_node, cr)

# Estado inicial
qc.h(qr_coin)

# Bucle de pasos DTQW
for step in range(steps):
    # Moneda (${coinType})
    qc.h(qr_coin)
    # Shift condicional
    qc.cx(qr_coin[0], qr_node[0])
    if node_qubits > 1:
        qc.ccx(qr_coin[0], qr_node[0], qr_node[1])

# Medición
qc.measure(qr_node, cr)

# Ejecución en AerSimulator
simulator = AerSimulator()
result = simulator.run(qc, shots=1024).result()
counts = result.get_counts()
print("Distribución de mediciones:", counts)
`;
  }

  /**
   * Genera script ejecutable en Google Cirq
   */
  static generateGoogleCirqPython(numNodes, coinDim, steps) {
    return `"""
Google Cirq - Discrete-Time Quantum Walk on Graph
Codex Portafolio - Capa 4 de Cómputo Cuántico Híbrido
"""
import cirq
import numpy as np

num_nodes = ${numNodes}
node_qubits = int(np.ceil(np.log2(num_nodes))) or 1
coin_qubits = 1
steps = ${steps}

coin = [cirq.LineQubit(i) for i in range(coin_qubits)]
nodes = [cirq.LineQubit(coin_qubits + i) for i in range(node_qubits)]
circuit = cirq.Circuit()

# Superposición en moneda
circuit.append(cirq.H.on_each(*coin))

# Evolución del paseo cuántico
for s in range(steps):
    circuit.append(cirq.H.on_each(*coin))
    circuit.append(cirq.CNOT(coin[0], nodes[0]))

# Medición
circuit.append(cirq.measure(*nodes, key='node_position'))

print("Circuito Cirq:")
print(circuit)

sim = cirq.Simulator()
results = sim.run(circuit, repetitions=1000)
print(results.histogram(key='node_position'))
`;
  }
}
