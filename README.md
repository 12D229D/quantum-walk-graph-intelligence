# Quantum Walk Graph Intelligence Explorer 🪐

Herramienta interactiva y laboratorio visual de paseos aleatorios cuánticos (Quantum Random Walks en tiempo discreto DTQW y tiempo continuo CTQW) para detección de comunidades y búsqueda cuadrática acelerada en grafos complejos, alineada con la **Capa 4 de Cómputo Cuántico Híbrido** del portafolio Codex.

---

## 📌 Fundamentos Teóricos y Formulación Matemática

### 1. Caminata Aleatoria Clásica (Random Walk - Markoviano)
En un grafo no dirigido $G = (V, E)$, la probabilidad $p_v(t)$ de hallarse en el nodo $v$ en el instante $t$ sigue una dinámica difusiva gobernada por la matriz de transición estocástica:
$$p(t+1) = M \, p(t), \quad M_{uv} = \frac{A_{uv}}{\deg(v)}$$
La distancia media cuadrática satisface la difusión browniana clásica:
$$\sigma(t) \sim \sqrt{t}$$

### 2. Caminata Cuántica en Tiempo Discreto (DTQW)
El espacio de Hilbert total está compuesto por el espacio de la moneda y el de posiciones en el grafo:
$$\mathcal{H} = \mathcal{H}_{\text{coin}} \otimes \mathcal{H}_{\text{graph}}$$
El operador unitario de evolución por paso es:
$$U = S \cdot (C \otimes I)$$
- **Operador de Moneda $C$**: Moneda de Grover $G_{ij} = \frac{2}{d} - \delta_{ij}$, Hadamard $H$, o Transformada de Fourier Cuántica (QFT).
- **Operador de Shift Condicional $S$**: Traslada el estado hacia los nodos vecinos según el estado de la moneda:
  $$S |c\rangle |v\rangle = |c\rangle |v \oplus c\rangle$$
Gracias a la **interferencia cuántica constructiva y destructiva**, la caminata exhibe propagación balística lineal:
$$\sigma(t) \sim t$$
lo cual provee una aceleración cuadrática $\mathcal{O}(\sqrt{N})$ sobre la difusión clásica.

### 3. Caminata Cuántica en Tiempo Continuo (CTQW)
Evolución unitaria bajo la ecuación de Schrödinger sin operador de moneda auxiliar:
$$|\psi(t)\rangle = e^{-i H t} |\psi(0)\rangle$$
donde el Hamiltoniano $H$ corresponde a la matriz de adyacencia $A$ o al operador Laplaciano $L = D - A$.

---

## 🚀 Capacidades y Características

- **Visualizador Interactivo en Canvas 2D**: Renderizado en tiempo real con pulsos cuánticos, escala de probabilidad y fases complejas.
- **Topologías Preconfiguradas**:
  - Línea 1D (demostración pura de propagación balística vs gaussiana).
  - Ciclo / Anillo.
  - Hipercubo Booleano $Q_4$ (16 nodos con proyección n-dimensional).
  - Árboles Binarios Pegados (*Glued Trees*): Demostración de aceleración cuántica exponencial para atravesar el grafo.
  - Red Barabási-Albert Libre de Escala.
- **Búsqueda Cuántica con Oráculo de Fase ($\pi$)**: Localización acelerada del nodo objetivo mediante inversión de signo de fase.
- **Comparador Lado a Lado**: Histogramas dinámicos de distribución clásica browniana vs distribución cuántica con crestas de interferencia.
- **Inteligencia de Grafos Cuántica**:
  - Cálculo de Centralidad de Caminata Cuántica.
  - Detección y agrupamiento de comunidades cuánticas mediante coherencia de fase.
- **Transpilador OpenQASM 3.0 / Qiskit / Cirq**: Generación de código nativo para procesadores cuánticos de IBM y Google.
- **Persistencia Determinista Local**: Almacén estructurado en SQLite/LocalStorage para trazabilidad de jobs y simulaciones.

---

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5 Semántico + CSS3 con variables HSL Dark Mode + ES2024 Modules.
- **Álgebra Lineal Cuántica**: Implementación pura de números complejos, matrices unitarias, producto de Kronecker y exponenciación anti-Hermítica.
- **Interoperabilidad**: OpenQASM 3.0, Qiskit 1.x, Google Cirq 1.4+.
