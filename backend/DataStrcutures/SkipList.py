import random


class _Node:
    def __init__(self, key, level):
        self.key = key
        self.forward = [None] * (level + 1)


class SkipList:
    """Sorted set of unique keys: layered linked lists, O(log n) expected search.

    Level 0 holds every key; each node is promoted to the next level with
    probability p. Randomness comes from a seedable generator so runs repeat.
    """

    def __init__(self, seed=None, max_level=6, p=0.5):
        if max_level < 1:
            raise ValueError("max_level must be at least 1")
        if not 0 < p < 1:
            raise ValueError("p must be between 0 and 1")
        self.seed = seed
        self.max_level = max_level
        self.p = p
        self._rng = random.Random(seed)
        self.head = _Node(None, max_level - 1)
        self.size = 0

    def __len__(self):
        return self.size

    def __contains__(self, key):
        return self.search(key)

    def _random_level(self):
        level = 0
        while level < self.max_level - 1 and self._rng.random() < self.p:
            level += 1
        return level

    def _top_level(self):
        for i in range(self.max_level - 1, -1, -1):
            if self.head.forward[i] is not None:
                return i
        return 0

    def search(self, key):
        return self.search_path(key)["found"]

    def search_path(self, key):
        """Search and record each node visited as (level, key); key None is the head."""
        steps = []
        node = self.head
        for i in range(self.max_level - 1, -1, -1):
            steps.append({"level": i, "key": node.key})
            while node.forward[i] is not None and node.forward[i].key < key:
                node = node.forward[i]
                steps.append({"level": i, "key": node.key})
        nxt = node.forward[0]
        found = nxt is not None and nxt.key == key
        if found:
            steps.append({"level": 0, "key": nxt.key})
        return {"found": found, "path": steps}

    def insert(self, key):
        """Add key; returns its level (0-based), or None if it was already present."""
        update = [self.head] * self.max_level
        node = self.head
        for i in range(self.max_level - 1, -1, -1):
            while node.forward[i] is not None and node.forward[i].key < key:
                node = node.forward[i]
            update[i] = node
        nxt = node.forward[0]
        if nxt is not None and nxt.key == key:
            return None
        level = self._random_level()
        new = _Node(key, level)
        for i in range(level + 1):
            new.forward[i] = update[i].forward[i]
            update[i].forward[i] = new
        self.size += 1
        return level

    def delete(self, key):
        """Remove key; returns True if it was present."""
        update = [self.head] * self.max_level
        node = self.head
        for i in range(self.max_level - 1, -1, -1):
            while node.forward[i] is not None and node.forward[i].key < key:
                node = node.forward[i]
            update[i] = node
        target = node.forward[0]
        if target is None or target.key != key:
            return False
        for i in range(len(target.forward)):
            if update[i].forward[i] is target:
                update[i].forward[i] = target.forward[i]
        self.size -= 1
        return True

    def to_list(self):
        out = []
        node = self.head.forward[0]
        while node is not None:
            out.append(node.key)
            node = node.forward[0]
        return out

    def levels(self):
        """Keys on each level, level 0 first."""
        result = []
        for i in range(self.max_level):
            row = []
            node = self.head.forward[i]
            while node is not None:
                row.append(node.key)
                node = node.forward[i]
            result.append(row)
        return result

    def to_dict(self):
        return {
            "seed": self.seed,
            "size": self.size,
            "max_level": self.max_level,
            "p": self.p,
            "keys": self.to_list(),
            "levels": self.levels(),
        }
