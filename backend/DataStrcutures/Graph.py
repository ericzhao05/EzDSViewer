from collections import defaultdict, deque
import heapq


def build_graph(edges, directed=False):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        if not directed:
            graph[v].append(u)
    return graph


def bfs(graph, start):
    """Visit order; also finds shortest paths when edges are unweighted."""
    seen = {start}
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
    return order


def dfs(graph, start):
    seen = set()
    order = []

    def visit(node):
        seen.add(node)
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in seen:
                visit(neighbor)

    visit(start)
    return order


def topological_sort(num_nodes, edges):
    """Kahn's algorithm: returns [] if the graph has a cycle."""
    graph = defaultdict(list)
    indegree = [0] * num_nodes
    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(num_nodes) if indegree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    return order if len(order) == num_nodes else []


def dijkstra(graph, start):
    """graph maps node -> [(neighbor, weight)]; weights must be non-negative."""
    distances = {start: 0}
    heap = [(0, start)]
    while heap:
        distance, node = heapq.heappop(heap)
        if distance > distances[node]:
            continue
        for neighbor, weight in graph.get(node, []):
            candidate = distance + weight
            if candidate < distances.get(neighbor, float("inf")):
                distances[neighbor] = candidate
                heapq.heappush(heap, (candidate, neighbor))
    return distances


def dijkstra_with_parents(graph, start):
    """dijkstra that also records each node's predecessor, so the result is a real tree
    rooted at start even when zero-weight edges create ties."""
    distances = {start: 0}
    parents = {}
    heap = [(0, start)]
    while heap:
        distance, node = heapq.heappop(heap)
        if distance > distances[node]:
            continue
        for neighbor, weight in graph.get(node, []):
            candidate = distance + weight
            if candidate < distances.get(neighbor, float("inf")):
                distances[neighbor] = candidate
                parents[neighbor] = node
                heapq.heappush(heap, (candidate, neighbor))
    return distances, parents


def connected_components(num_nodes, edges):
    """Components of the graph treating edges as undirected; loops over every node."""
    graph = build_graph(edges)
    seen = set()
    comps = []
    for s in range(num_nodes):
        if s not in seen:
            comp = sorted(bfs(graph, s))
            seen.update(comp)
            comps.append(comp)
    return comps


def has_cycle(num_nodes, edges, directed):
    """Directed: track the current recursion path. Undirected: skip the parent edge."""
    graph = build_graph(edges, directed)
    if directed:
        state = {}  # 1 = on current path, 2 = finished

        def visit(node):
            state[node] = 1
            for nb in graph[node]:
                if state.get(nb) == 1:
                    return True
                if nb not in state and visit(nb):
                    return True
            state[node] = 2
            return False

        return any(s not in state and visit(s) for s in range(num_nodes))
    seen = set()

    def visit_u(node, parent):
        seen.add(node)
        skipped = False
        for nb in graph[node]:
            if nb == parent and not skipped:
                skipped = True
                continue
            if nb in seen or visit_u(nb, node):
                return True
        return False

    return any(s not in seen and visit_u(s, -1) for s in range(num_nodes))


class Graph:
    """Small editable graph over nodes 0..n-1 with optional direction and integer weights."""

    def __init__(self, n=0, directed=False):
        self.n = n
        self.directed = directed
        self.weights = {}  # (u, v) -> weight; undirected edges are stored with u < v

    def _key(self, u, v):
        return (u, v) if self.directed or u < v else (v, u)

    def _check(self, *nodes):
        for x in nodes:
            if not 0 <= x < self.n:
                raise IndexError(f"node {x} out of range")

    def add_node(self):
        self.n += 1
        return self.n - 1

    def remove_last_node(self):
        if self.n == 0:
            raise IndexError("graph has no nodes")
        last = self.n - 1
        self.weights = {k: w for k, w in self.weights.items() if last not in k}
        self.n -= 1
        return last

    def add_edge(self, u, v, w=1):
        self._check(u, v)
        if u == v:
            raise ValueError("self loops are not allowed")
        self.weights[self._key(u, v)] = w

    def remove_edge(self, u, v):
        self._check(u, v)
        key = self._key(u, v)
        if key not in self.weights:
            raise KeyError("no such edge")
        del self.weights[key]

    def set_directed(self, directed):
        if directed == self.directed:
            return
        self.directed = directed
        merged = {}
        for (u, v), w in self.weights.items():
            merged.setdefault(self._key(u, v), w)
        self.weights = merged

    def edge_list(self):
        return [(u, v) for (u, v) in self.weights]

    def adjacency(self):
        g = build_graph(self.edge_list(), self.directed)
        for i in range(self.n):
            g[i]  # ensure every node is present
        return g

    def weighted_adjacency(self):
        g = defaultdict(list)
        for (u, v), w in self.weights.items():
            g[u].append((v, w))
            if not self.directed:
                g[v].append((u, w))
        return g

    def to_dict(self):
        return {
            "n": self.n,
            "directed": self.directed,
            "edges": [{"u": u, "v": v, "w": w} for (u, v), w in sorted(self.weights.items())],
        }
