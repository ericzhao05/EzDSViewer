class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_list(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev


def has_cycle(head):
    """Floyd's tortoise and hare: the fast pointer catches the slow one in a cycle."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False


def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


def merge_sorted(a, b):
    """A dummy node removes the special case for the first element."""
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next


def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next


def from_list(values):
    """Build a chain of ListNodes from a Python list; returns the head (or None)."""
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


class LinkedList:
    """Singly linked list wrapper used by the API and view. Nodes are ListNode."""

    def __init__(self, values=()):
        self.head = from_list(values)

    def _nodes(self):
        """Nodes in order, stopping safely if the list loops back on itself."""
        nodes, seen = [], set()
        node = self.head
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            nodes.append(node)
            node = node.next
        return nodes

    def __len__(self):
        return len(self._nodes())

    def to_list(self):
        return [n.val for n in self._nodes()]

    def cycle_to(self):
        """Index the last node points back to, or None when there is no cycle."""
        nodes = self._nodes()
        if not nodes or nodes[-1].next is None:
            return None
        target = nodes[-1].next
        for i, n in enumerate(nodes):
            if n is target:
                return i
        return None

    def to_dict(self):
        values = self.to_list()
        return {"values": values, "length": len(values), "cycle_to": self.cycle_to()}

    def push_front(self, value):
        self.head = ListNode(value, self.head)

    def push_back(self, value):
        node = ListNode(value)
        nodes = self._nodes()
        if nodes:
            nodes[-1].next = node
        else:
            self.head = node

    def insert(self, index, value):
        nodes = self._nodes()
        if index < 0 or index > len(nodes):
            raise IndexError("index out of range")
        if index == 0:
            self.push_front(value)
            return
        prev = nodes[index - 1]
        prev.next = ListNode(value, prev.next)

    def delete(self, index):
        nodes = self._nodes()
        if not 0 <= index < len(nodes):
            raise IndexError("index out of range")
        value = nodes[index].val
        if index == 0:
            self.head = nodes[0].next
        else:
            nodes[index - 1].next = nodes[index].next
        return value

    def find(self, value):
        for i, n in enumerate(self._nodes()):
            if n.val == value:
                return i
        return -1

    def reverse(self):
        self.head = reverse_list(self.head)

    def middle_index(self):
        if self.head is None:
            raise IndexError("list is empty")
        mid = middle_node(self.head)
        for i, n in enumerate(self._nodes()):
            if n is mid:
                return i
        raise IndexError("list is empty")

    def make_cycle(self, index):
        nodes = self._nodes()
        if not 0 <= index < len(nodes):
            raise IndexError("index out of range")
        nodes[-1].next = nodes[index]

    def break_cycle(self):
        nodes = self._nodes()
        if nodes:
            nodes[-1].next = None

    def merge(self, values):
        self.head = merge_sorted(self.head, from_list(values))

    def remove_nth_from_end(self, n):
        size = len(self)
        if not 1 <= n <= size:
            raise IndexError("n out of range")
        value = self._nodes()[size - n].val
        self.head = remove_nth_from_end(self.head, n)
        return value


class DoublyNode:
    def __init__(self, val=0, prev=None, next=None, id=None):
        self.val = val
        self.prev = prev
        self.next = next
        self.id = id


class DoublyLinkedList:
    """Doubly linked list with real prev and next pointers.

    Every node gets an id that stays with it for life and is never reused by this
    list, so node_by_id gives the API a dictionary lookup to the node it names. That
    is what keeps insert_after and delete O(1): neither one walks the list.
    """

    def __init__(self, values=()):
        self.head = None
        self.tail = None
        self._size = 0
        self._next_id = 1
        self._by_id = {}
        for v in values:
            self.push_back(v)

    def __len__(self):
        return self._size

    def _link(self, prev, value, next):
        """Create a node between two neighbours (either may be None); O(1)."""
        node = DoublyNode(value, prev, next, self._next_id)
        self._next_id += 1
        self._by_id[node.id] = node
        self._size += 1
        if prev is None:
            self.head = node
        else:
            prev.next = node
        if next is None:
            self.tail = node
        else:
            next.prev = node
        return node

    def _require_own(self, node):
        if node is None or self._by_id.get(getattr(node, "id", None)) is not node:
            raise ValueError("node is not in this list")

    def node_by_id(self, node_id):
        return self._by_id.get(node_id)

    def push_front(self, value):
        return self._link(None, value, self.head)

    def push_back(self, value):
        return self._link(self.tail, value, None)

    def insert_after(self, node, value):
        self._require_own(node)
        return self._link(node, value, node.next)

    def delete(self, node):
        self._require_own(node)
        if node.prev is None:
            self.head = node.next
        else:
            node.prev.next = node.next
        if node.next is None:
            self.tail = node.prev
        else:
            node.next.prev = node.prev
        node.prev = node.next = None
        del self._by_id[node.id]
        self._size -= 1
        return node.val

    def pop_front(self):
        if self.head is None:
            raise IndexError("pop from empty list")
        return self.delete(self.head)

    def pop_back(self):
        if self.tail is None:
            raise IndexError("pop from empty list")
        return self.delete(self.tail)

    def forward(self):
        node = self.head
        while node is not None:
            yield node
            node = node.next

    def backward(self):
        node = self.tail
        while node is not None:
            yield node
            node = node.prev

    def find(self, value):
        """The first node from the head holding value, or None; O(n)."""
        for node in self.forward():
            if node.val == value:
                return node
        return None

    def to_list(self):
        return [n.val for n in self.forward()]

    def to_list_backward(self):
        return [n.val for n in self.backward()]

    def to_dict(self):
        nodes = [
            {
                "id": n.id,
                "value": n.val,
                "prev": n.prev.id if n.prev else None,
                "next": n.next.id if n.next else None,
            }
            for n in self.forward()
        ]
        return {
            "values": [n["value"] for n in nodes],
            "length": self._size,
            "head": self.head.id if self.head else None,
            "tail": self.tail.id if self.tail else None,
            "nodes": nodes,
        }
