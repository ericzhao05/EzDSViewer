class SuffixArray:
    """Suffix array of a string, with its LCP array and binary-search substring lookup."""

    def __init__(self, text=""):
        self.set_text(text)

    def set_text(self, text):
        self.text = text
        self.sa = self._build(text)
        self.lcp = self._build_lcp(text, self.sa)

    @staticmethod
    def _build(text):
        """Prefix doubling: sort by the first 2^k characters, doubling k until all ranks differ."""
        n = len(text)
        sa = list(range(n))
        rank = [ord(c) for c in text]
        k = 1
        while n > 1:
            key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
            sa.sort(key=key)
            new_rank = [0] * n
            for j in range(1, n):
                new_rank[sa[j]] = new_rank[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
            rank = new_rank
            if rank[sa[-1]] == n - 1:
                break
            k *= 2
        return sa

    @staticmethod
    def _build_lcp(text, sa):
        """Kasai: lcp[i] is the common prefix length of suffixes sa[i-1] and sa[i]; lcp[0] = 0."""
        n = len(text)
        rank = [0] * n
        for i, s in enumerate(sa):
            rank[s] = i
        lcp = [0] * n
        h = 0
        for i in range(n):
            if rank[i] > 0:
                j = sa[rank[i] - 1]
                while i + h < n and j + h < n and text[i + h] == text[j + h]:
                    h += 1
                lcp[rank[i]] = h
                if h > 0:
                    h -= 1
            else:
                h = 0
        return lcp

    def suffixes(self):
        return [self.text[i:] for i in self.sa]

    def _bound(self, pattern, upper):
        lo, hi = 0, len(self.sa)
        m = len(pattern)
        while lo < hi:
            mid = (lo + hi) // 2
            head = self.text[self.sa[mid]:self.sa[mid] + m]
            if head < pattern or (upper and head == pattern):
                lo = mid + 1
            else:
                hi = mid
        return lo

    def search_range(self, pattern):
        """Half-open range [lo, hi) of suffix-array rows that start with pattern."""
        return self._bound(pattern, False), self._bound(pattern, True)

    def search(self, pattern):
        """Sorted start positions of every occurrence of pattern."""
        lo, hi = self.search_range(pattern)
        return sorted(self.sa[lo:hi])

    def count(self, pattern):
        lo, hi = self.search_range(pattern)
        return hi - lo

    def longest_repeated_substring(self):
        if not self.lcp:
            return ""
        i = max(range(len(self.lcp)), key=lambda j: self.lcp[j])
        return self.text[self.sa[i]:self.sa[i] + self.lcp[i]]

    def to_dict(self):
        return {
            "text": self.text,
            "sa": list(self.sa),
            "lcp": list(self.lcp),
            "suffixes": self.suffixes(),
        }
