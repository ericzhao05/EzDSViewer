import math

from flask import Blueprint

from DataStrcutures import Graph as g
from api.routes._common import body, fail, ok

bp = Blueprint("graph", __name__, url_prefix="/graph")

MAX_NODES = 12
MAX_ABS_WEIGHT = 1000
DEFAULT_EDGES = [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5), (3, 4, 3)]


def _fresh():
    graph = g.Graph(5, False)
    for u, v, w in DEFAULT_EDGES:
        graph.add_edge(u, v, w)
    return graph


graph = _fresh()


def _state():
    d = graph.to_dict()
    d["limits"] = {"max_nodes": MAX_NODES, "max_abs_weight": MAX_ABS_WEIGHT}
    return d


def _bad(msg):
    return fail(msg, _state())


def _int(v, lo=None, hi=None):
    if isinstance(v, float) and math.isfinite(v) and v == int(v):
        v = int(v)
    if not isinstance(v, int) or isinstance(v, bool):
        return None
    if (lo is not None and v < lo) or (hi is not None and v > hi):
        return None
    return v


def _node(data, key):
    v = _int(data.get(key), 0, graph.n - 1)
    if v is None:
        raise ValueError(f"'{key}' must be an existing node (0 to {graph.n - 1})")
    return v


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global graph
    graph = _fresh()
    return ok(_state())


@bp.route("/add-node", methods=["POST"])
def add_node():
    if graph.n >= MAX_NODES:
        return _bad(f"graph is limited to {MAX_NODES} nodes")
    idx = graph.add_node()
    return ok(_state(), idx)


@bp.route("/remove-node", methods=["POST"])
def remove_node():
    if graph.n == 0:
        return _bad("graph has no nodes")
    idx = graph.remove_last_node()
    return ok(_state(), idx)


@bp.route("/add-edge", methods=["POST"])
def add_edge():
    data = body()
    try:
        u, v = _node(data, "u"), _node(data, "v")
    except ValueError as e:
        return _bad(str(e))
    w = _int(data.get("w", 1), -MAX_ABS_WEIGHT, MAX_ABS_WEIGHT)
    if w is None:
        return _bad(f"'w' must be a whole number from -{MAX_ABS_WEIGHT} to {MAX_ABS_WEIGHT}")
    if u == v:
        return _bad("self loops are not allowed")
    graph.add_edge(u, v, w)
    return ok(_state(), {"u": u, "v": v, "w": w})


@bp.route("/remove-edge", methods=["POST"])
def remove_edge():
    data = body()
    try:
        u, v = _node(data, "u"), _node(data, "v")
        graph.remove_edge(u, v)
    except (ValueError, KeyError) as e:
        return _bad(str(e).strip("'\""))
    return ok(_state(), {"u": u, "v": v})


@bp.route("/set-directed", methods=["POST"])
def set_directed():
    d = body().get("directed")
    if not isinstance(d, bool):
        return _bad("'directed' must be true or false")
    graph.set_directed(d)
    return ok(_state(), d)


def _start(data):
    if graph.n == 0:
        raise ValueError("graph has no nodes")
    return _node(data, "start")


def _tree_edges(order, adj):
    """Edges used to discover each node: first visited neighbour that is earlier in order."""
    pos = {x: i for i, x in enumerate(order)}
    out = []
    for x in order[1:]:
        parent = min((p for p in order if pos[p] < pos[x] and x in adj[p]), key=pos.get)
        out.append([parent, x])
    return out


@bp.route("/bfs", methods=["POST"])
def run_bfs():
    try:
        s = _start(body())
    except ValueError as e:
        return _bad(str(e))
    adj = graph.adjacency()
    order = g.bfs(adj, s)
    return ok(_state(), {"start": s, "order": order, "tree_edges": _tree_edges(order, adj)})


@bp.route("/dfs", methods=["POST"])
def run_dfs():
    try:
        s = _start(body())
    except ValueError as e:
        return _bad(str(e))
    adj = graph.adjacency()
    order = g.dfs(adj, s)
    return ok(_state(), {"start": s, "order": order})


@bp.route("/topological-sort", methods=["POST"])
def run_topo():
    if not graph.directed:
        return _bad("topological sort needs a directed graph")
    order = g.topological_sort(graph.n, graph.edge_list())
    return ok(_state(), {"order": order, "has_cycle": graph.n > 0 and not order})


@bp.route("/dijkstra", methods=["POST"])
def run_dijkstra():
    try:
        s = _start(body())
    except ValueError as e:
        return _bad(str(e))
    if any(w < 0 for w in graph.weights.values()):
        return _bad("Dijkstra needs non-negative weights; remove or change the negative edges")
    wadj = graph.weighted_adjacency()
    dist = g.dijkstra(wadj, s)
    tree = []
    for node in sorted(dist):
        if node == s:
            continue
        for p in sorted(dist):
            if any(nb == node and dist[p] + w == dist[node] for nb, w in wadj.get(p, [])):
                tree.append([p, node])
                break
    return ok(
        _state(),
        {"start": s, "distances": [dist.get(i) for i in range(graph.n)], "tree_edges": tree},
    )


@bp.route("/components", methods=["POST"])
def run_components():
    comps = g.connected_components(graph.n, graph.edge_list())
    return ok(_state(), {"components": comps})


@bp.route("/has-cycle", methods=["POST"])
def run_has_cycle():
    return ok(_state(), {"has_cycle": g.has_cycle(graph.n, graph.edge_list(), graph.directed)})
