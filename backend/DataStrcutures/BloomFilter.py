import hashlib
import math


class BloomFilter:
    """Compact set test: never a false negative, occasionally a false positive."""

    def __init__(self, size=32, num_hashes=3):
        if not isinstance(size, int) or isinstance(size, bool) or size < 1:
            raise ValueError("size must be a positive integer")
        if not isinstance(num_hashes, int) or isinstance(num_hashes, bool) or num_hashes < 1:
            raise ValueError("num_hashes must be a positive integer")
        self.size = size
        self.num_hashes = num_hashes
        self.bits = [0] * size
        self.count = 0  # number of add() calls

    def positions(self, item):
        """The bit indices an item maps to, by double hashing one SHA-256 digest."""
        digest = hashlib.sha256(str(item).encode("utf-8")).digest()
        h1 = int.from_bytes(digest[:8], "big")
        h2 = int.from_bytes(digest[8:16], "big") | 1
        return [(h1 + i * h2) % self.size for i in range(self.num_hashes)]

    def add(self, item):
        pos = self.positions(item)
        for p in pos:
            self.bits[p] = 1
        self.count += 1
        return pos

    def might_contain(self, item):
        """False means definitely absent; True means possibly present."""
        return all(self.bits[p] for p in self.positions(item))

    def __contains__(self, item):
        return self.might_contain(item)

    def bits_set(self):
        return sum(self.bits)

    def false_positive_rate(self):
        """Estimated chance that an absent item is reported present: (1 - e^(-kn/m))^k."""
        return (1 - math.exp(-self.num_hashes * self.count / self.size)) ** self.num_hashes

    def to_dict(self):
        return {
            "size": self.size,
            "num_hashes": self.num_hashes,
            "bits": list(self.bits),
            "count": self.count,
            "bits_set": self.bits_set(),
            "false_positive_rate": self.false_positive_rate(),
        }
