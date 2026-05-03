# Delhi-Dehradun Expressway Simulator

A full-stack web application simulating the Delhi-Dehradun Expressway network, modeling it as a graph where nodes represent locations/interchanges and edges represent road segments. It demonstrates multiple core computer science algorithms applied to a realistic transportation system.

## Features & Algorithms

The simulator implements 6 primary algorithms on the backend in pure modern C++ (no external algorithm libraries) with a beautiful, dynamic Dark Mode UI using glassmorphism.

### 1. Shortest Path (Dijkstra's Algorithm)
Find the optimal route between any two interchanges based on Distance, Time, or Toll.
- **Time Complexity:** $O((V + E) \log V)$ using a Min-Priority Queue.
- **Space Complexity:** $O(V)$ for distances, priority queue, and parent pointers.

### 2. Minimum Spanning Tree (Kruskal's Algorithm)
Generates the core backbone network minimizing the total chosen metric.
- **Time Complexity:** $O(E \log E)$ for sorting the edges, and $O(E \alpha(V))$ for the Union-Find operations (where $\alpha$ is the inverse Ackermann function).
- **Space Complexity:** $O(V + E)$ for Union-Find DSU and storing the sorted edges.

### 3. Dynamic Toll Management (Fenwick Tree / Binary Indexed Tree)
Update tolls on individual road segments and query the total toll revenue over a range of segments extremely fast.
- **Time Complexity:** $O(\log E)$ for both Point Updates and Range Queries.
- **Space Complexity:** $O(E)$ for the Fenwick Tree array.

### 4. Vehicle Pass Tracking (Bloom Filter)
Check if a specific vehicle has passed through the network utilizing a probabilistic data structure to drastically save memory.
- **Time Complexity:** $O(k)$ for both addition and membership queries (where $k$ is the number of hash functions, constant).
- **Space Complexity:** $O(m)$ where $m$ is the bit array size (configured to $10000$ bits for space efficiency).

### 5. Top-K Toll Roads (Sorting / Heap Approach)
Identify the $K$ most expensive road segments in the network for revenue analytics.
- **Time Complexity:** $O(E \log E)$ implemented via full sort (can be optimized to $O(E \log K)$ using a Min-Heap).
- **Space Complexity:** $O(E)$ to store and sort the edges.

### 6. Negative Cycle Detection (Bellman-Ford Algorithm)
Simulates fuel arbitrage opportunities. By setting an edge weight to `Toll - FuelSavings`, a negative cycle indicates a loop where the fuel savings surpass the toll costs continually.
- **Time Complexity:** $O(V \times E)$ to relax all edges $V-1$ times.
- **Space Complexity:** $O(V)$ for the distance array and parent pointers to reconstruct the cycle.

## Project Structure

```
.
├── backend/
│   ├── server.cpp       # Main C++ Server containing all Algorithms
│   ├── httplib.h        # cpp-httplib for REST API Server (header-only)
│   ├── json.hpp         # nlohmann json parsing (header-only)
│   └── Makefile         # Build configuration
├── public/
│   ├── index.html       # Web interface HTML
│   ├── styles.css       # Premium dynamic glassmorphism UI
│   └── script.js        # Frontend logic and API calls
├── expressway.txt       # Graph data file representing the network
└── README.md            # Project Documentation
```

## Setup Instructions

### Backend (C++)
The backend relies on `g++` or `clang++` supporting C++17.
If you are on Linux (e.g., Fedora, Ubuntu):
1. Install a C++ compiler:
   ```bash
   sudo dnf install gcc-c++   # For Fedora
   sudo apt install g++       # For Debian/Ubuntu
   ```
2. Navigate to the backend directory and build:
   ```bash
   cd backend
   make
   ```
3. Run the server:
   ```bash
   ./server
   ```
   *The server will start on `http://0.0.0.0:8080` and automatically load `../expressway.txt`.*

### Frontend
Since the frontend is built using standard Vanilla HTML/CSS/JS, you simply need to serve the `public/` directory or open the HTML file.
You can use `npx serve` or any live server:
```bash
cd public
npx serve .
```
Or use the Python built-in HTTP server:
```bash
python3 -m http.server 3000 --directory public
```
Then visit `http://localhost:3000` in your web browser.

## API Documentation

The C++ server exposes the following REST APIs with CORS enabled:

- `GET /api/graph-data` : Returns all nodes and edges.
- `GET /api/shortest-path?source={id}&destination={id}&metric={metric}` : Returns shortest path and cost.
- `GET /api/mst?metric={metric}` : Returns MST edges and total weight.
- `POST /api/toll/update` : Expects JSON `{"edgeId": 5, "toll": 150.0}`, updates toll value.
- `GET /api/toll/query?L={id}&R={id}` : Returns range sum of tolls.
- `POST /api/vehicle/pass` : Expects JSON `{"vehicleId": "DL-..."}`, records vehicle in Bloom Filter.
- `GET /api/vehicle/check?vehicleId={id}` : Returns membership status and fill rate.
- `GET /api/top-k-tolls?k={number}` : Returns sorted top K highest toll edges.
- `GET /api/negative-cycle?fuelSavings={amount}` : Detects negative cycles and returns the cycle path if any.
