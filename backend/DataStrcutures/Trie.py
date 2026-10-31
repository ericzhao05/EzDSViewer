class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            node = node.children.setdefault(char, TrieNode())
        node.is_word = True

    def _find(self, text):
        node = self.root
        for char in text:
            node = node.children.get(char)
            if node is None:
                return None
        return node

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_word

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def delete(self, word):
        """Remove word and prune nodes that no longer serve any word.

        Returns True if word was stored. An absent word or a mere prefix changes
        nothing and returns False. O(L), and iterative, so depth is not a limit.
        """
        path = []
        node = self.root
        for char in word:
            child = node.children.get(char)
            if child is None:
                return False
            path.append((node, char))
            node = child
        if not node.is_word:
            return False
        node.is_word = False
        for parent, char in reversed(path):
            if node.is_word or node.children:
                break
            del parent.children[char]
            node = parent
        return True

    # --- helpers for the API and the view ---------------------------------

    def matched_length(self, text):
        """How many leading characters of text can be followed from the root."""
        node = self.root
        for i, char in enumerate(text):
            node = node.children.get(char)
            if node is None:
                return i
        return len(text)

    def words(self, prefix=""):
        """All stored words that start with prefix, in alphabetical order."""
        node = self._find(prefix)
        out = []
        if node is None:
            return out

        def walk(n, acc):
            if n.is_word:
                out.append(acc)
            for ch in sorted(n.children):
                walk(n.children[ch], acc + ch)

        walk(node, prefix)
        return out

    def to_dict(self):
        def conv(node, char):
            return {
                "char": char,
                "is_word": node.is_word,
                "children": [conv(node.children[c], c) for c in sorted(node.children)],
            }

        return conv(self.root, "")
