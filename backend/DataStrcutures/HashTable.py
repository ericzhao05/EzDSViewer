from collections import defaultdict


class HashMap:
    """Separate-chaining hash table (reference: ds.md section 3).

    hash_fn is an optional addition so the tutoring API can use a deterministic
    hash; it defaults to the built-in hash().
    """

    def __init__(self, capacity=8, hash_fn=hash):
        self._buckets = [[] for _ in range(capacity)]
        self._size = 0
        self._hash = hash_fn

    def __len__(self):
        return self._size

    def _bucket(self, key):
        return self._buckets[self._hash(key) % len(self._buckets)]

    def put(self, key, value):
        bucket = self._bucket(key)
        for entry in bucket:
            if entry[0] == key:
                entry[1] = value
                return
        bucket.append([key, value])
        self._size += 1
        if self._size / len(self._buckets) > 0.75:
            self._resize()

    def get(self, key, default=None):
        for k, v in self._bucket(key):
            if k == key:
                return v
        return default

    def remove(self, key):
        bucket = self._bucket(key)
        for i, entry in enumerate(bucket):
            if entry[0] == key:
                bucket.pop(i)
                self._size -= 1
                return True
        return False

    def _resize(self):
        old_buckets = self._buckets
        self._buckets = [[] for _ in range(len(old_buckets) * 2)]
        for bucket in old_buckets:
            for key, value in bucket:
                self._bucket(key).append([key, value])

    # State export for the API and view.
    @property
    def capacity(self):
        return len(self._buckets)

    def to_dict(self):
        return {
            "capacity": len(self._buckets),
            "size": self._size,
            "load_factor": self._size / len(self._buckets),
            "threshold": 0.75,
            "buckets": [[[k, v] for k, v in b] for b in self._buckets],
        }


def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
    return []


def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        groups[tuple(sorted(word))].append(word)
    return list(groups.values())


def longest_consecutive(nums):
    values = set(nums)
    best = 0
    for num in values:
        if num - 1 not in values:
            length = 1
            while num + length in values:
                length += 1
            best = max(best, length)
    return best
