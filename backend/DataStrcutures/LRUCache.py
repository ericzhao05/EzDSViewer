class _CacheNode:
    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self._nodes = {}
        self._head = _CacheNode()
        self._tail = _CacheNode()
        self._head.next = self._tail
        self._tail.prev = self._head

    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node):
        node.prev = self._head
        node.next = self._head.next
        self._head.next.prev = node
        self._head.next = node

    def get(self, key):
        node = self._nodes.get(key)
        if node is None:
            return -1
        self._remove(node)
        self._add_front(node)
        return node.value

    def put(self, key, value):
        if key in self._nodes:
            self._remove(self._nodes[key])
        node = _CacheNode(key, value)
        self._nodes[key] = node
        self._add_front(node)
        if len(self._nodes) > self.capacity:
            oldest = self._tail.prev
            self._remove(oldest)
            del self._nodes[oldest.key]

    def __len__(self):
        return len(self._nodes)

    def __contains__(self, key):
        return key in self._nodes

    def items(self):
        """(key, value) pairs from most to least recently used."""
        out = []
        node = self._head.next
        while node is not self._tail:
            out.append((node.key, node.value))
            node = node.next
        return out

    def to_dict(self):
        return {
            "capacity": self.capacity,
            "size": len(self._nodes),
            "order": [{"key": k, "value": v} for k, v in self.items()],
        }
