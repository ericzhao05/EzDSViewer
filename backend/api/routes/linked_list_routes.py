from flask import Blueprint

from DataStrcutures.LinkedList import DoublyLinkedList, LinkedList, has_cycle
from api.routes._common import body, fail, ok

bp = Blueprint("linked_list", __name__, url_prefix="/linked-list")

MAX_NODES = 30
MAX_INT = 10 ** 9
INITIAL = [1, 2, 3, 4, 5]

lst = LinkedList(INITIAL)
dll = DoublyLinkedList(INITIAL)


def _state():
    return lst.to_dict()


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _data():
    data = body()
    return data if isinstance(data, dict) else None


def _cyclic():
    return lst.cycle_to() is not None


def _sorted(values):
    return all(values[i] <= values[i + 1] for i in range(len(values) - 1))


CYCLE_MSG = "The list has a cycle. Break the cycle first."


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global lst
    lst = LinkedList(INITIAL)
    return ok(_state())


def _add(op):
    data = _data()
    if data is None or not _is_int(data.get("value")):
        return fail("value must be an integer", _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    if len(lst) >= MAX_NODES:
        return fail("List is limited to %d nodes" % MAX_NODES, _state())
    op(data["value"])
    return ok(_state())


@bp.route("/push-front", methods=["POST"])
def push_front():
    return _add(lst.push_front)


@bp.route("/push-back", methods=["POST"])
def push_back():
    return _add(lst.push_back)


@bp.route("/insert", methods=["POST"])
def insert():
    data = _data()
    if data is None or not _is_int(data.get("index")) or not _is_int(data.get("value")):
        return fail("index and value must be integers", _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    if len(lst) >= MAX_NODES:
        return fail("List is limited to %d nodes" % MAX_NODES, _state())
    try:
        lst.insert(data["index"], data["value"])
    except IndexError:
        return fail("index must be between 0 and %d" % len(lst), _state())
    return ok(_state())


@bp.route("/delete", methods=["POST"])
def delete():
    data = _data()
    if data is None or not _is_int(data.get("index")):
        return fail("index must be an integer", _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    if len(lst) == 0:
        return fail("List is empty", _state())
    try:
        removed = lst.delete(data["index"])
    except IndexError:
        return fail("index must be between 0 and %d" % (len(lst) - 1), _state())
    return ok(_state(), {"removed": removed})


@bp.route("/find", methods=["POST"])
def find():
    data = _data()
    if data is None or not _is_int(data.get("value")):
        return fail("value must be an integer", _state())
    index = lst.find(data["value"])
    return ok(_state(), {"found": index >= 0, "index": index if index >= 0 else None})


@bp.route("/reverse", methods=["POST"])
def reverse():
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    lst.reverse()
    return ok(_state())


@bp.route("/middle", methods=["POST"])
def middle():
    if len(lst) == 0:
        return fail("List is empty", _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    index = lst.middle_index()
    return ok(_state(), {"index": index, "value": lst.to_list()[index]})


@bp.route("/has-cycle", methods=["POST"])
def has_cycle_op():
    return ok(_state(), {"has_cycle": has_cycle(lst.head), "cycle_to": lst.cycle_to()})


@bp.route("/make-cycle", methods=["POST"])
def make_cycle():
    data = _data()
    if data is None or not _is_int(data.get("index")):
        return fail("index must be an integer", _state())
    if len(lst) == 0:
        return fail("List is empty", _state())
    if _cyclic():
        return fail("The list already has a cycle", _state())
    try:
        lst.make_cycle(data["index"])
    except IndexError:
        return fail("index must be between 0 and %d" % (len(lst) - 1), _state())
    return ok(_state())


@bp.route("/break-cycle", methods=["POST"])
def break_cycle():
    lst.break_cycle()
    return ok(_state())


@bp.route("/merge-sorted", methods=["POST"])
def merge_sorted_op():
    data = _data()
    other = data.get("values") if data else None
    if not isinstance(other, list) or len(other) > MAX_NODES or not all(_is_int(v) for v in other):
        return fail("values must be a list of integers (max %d)" % MAX_NODES, _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    mine = lst.to_list()
    if not _sorted(mine) or not _sorted(other):
        return fail("Both lists must be sorted ascending", _state())
    if len(mine) + len(other) > MAX_NODES:
        return fail("List is limited to %d nodes" % MAX_NODES, _state())
    lst.merge(other)
    return ok(_state())


@bp.route("/remove-nth-from-end", methods=["POST"])
def remove_nth():
    data = _data()
    if data is None or not _is_int(data.get("n")):
        return fail("n must be an integer", _state())
    if _cyclic():
        return fail(CYCLE_MSG, _state())
    size = len(lst)
    if not 1 <= data["n"] <= size:
        return fail("n must be between 1 and %d" % size if size else "List is empty", _state())
    return ok(_state(), {"removed": lst.remove_nth_from_end(data["n"])})


# --- doubly linked list: separate state, addressed by stable node id -------------


def _dstate():
    return dll.to_dict()


def _dbad(message):
    return fail(message, _dstate())


def _known_node(data):
    """The node a request names, by dictionary lookup on its id (no list walk)."""
    node_id = data.get("node")
    return dll.node_by_id(node_id) if _is_int(node_id) else None


def _node_error(data):
    if len(dll) == 0:
        return "List is empty"
    if not _is_int(data.get("node")):
        return "node must be an integer node id"
    return "No node with id %d" % data["node"]


@bp.route("/doubly", methods=["GET"])
def doubly_get_state():
    return ok(_dstate())


@bp.route("/doubly/reset", methods=["POST"])
def doubly_reset():
    global dll
    dll = DoublyLinkedList(INITIAL)
    return ok(_dstate())


def _dpush(op):
    data = _data()
    if not _is_int(data.get("value")):
        return _dbad("value must be an integer")
    if len(dll) >= MAX_NODES:
        return _dbad("List is limited to %d nodes" % MAX_NODES)
    node = op(data["value"])
    return ok(_dstate(), {"node": node.id})


@bp.route("/doubly/push-front", methods=["POST"])
def doubly_push_front():
    return _dpush(dll.push_front)


@bp.route("/doubly/push-back", methods=["POST"])
def doubly_push_back():
    return _dpush(dll.push_back)


def _ddelete(node):
    node_id = node.id
    removed = dll.delete(node)
    return ok(_dstate(), {"removed": removed, "node": node_id})


@bp.route("/doubly/pop-front", methods=["POST"])
def doubly_pop_front():
    return _ddelete(dll.head) if dll.head else _dbad("List is empty")


@bp.route("/doubly/pop-back", methods=["POST"])
def doubly_pop_back():
    return _ddelete(dll.tail) if dll.tail else _dbad("List is empty")


@bp.route("/doubly/insert-after", methods=["POST"])
def doubly_insert_after():
    data = _data()
    node = _known_node(data)
    if node is None:
        return _dbad(_node_error(data))
    if not _is_int(data.get("value")):
        return _dbad("value must be an integer")
    if len(dll) >= MAX_NODES:
        return _dbad("List is limited to %d nodes" % MAX_NODES)
    new = dll.insert_after(node, data["value"])
    return ok(_dstate(), {"node": new.id, "after": node.id})


@bp.route("/doubly/delete", methods=["POST"])
def doubly_delete():
    data = _data()
    node = _known_node(data)
    if node is None:
        return _dbad(_node_error(data))
    return _ddelete(node)


@bp.route("/doubly/find", methods=["POST"])
def doubly_find():
    data = _data()
    if not _is_int(data.get("value")):
        return _dbad("value must be an integer")
    node = dll.find(data["value"])
    if node is None:
        return ok(_dstate(), {"found": False, "node": None, "index": None})
    index = next(i for i, n in enumerate(dll.forward()) if n is node)
    return ok(_dstate(), {"found": True, "node": node.id, "index": index})


def _traversal(direction, nodes):
    return ok(_dstate(), {
        "direction": direction,
        "values": [n.val for n in nodes],
        "nodes": [n.id for n in nodes],
    })


@bp.route("/doubly/traverse-forward", methods=["POST"])
def doubly_traverse_forward():
    return _traversal("forward", list(dll.forward()))


@bp.route("/doubly/traverse-backward", methods=["POST"])
def doubly_traverse_backward():
    return _traversal("backward", list(dll.backward()))
