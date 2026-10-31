"""Stack structures and algorithms from ds.md section 5."""


class ArrayStack:
    def __init__(self):
        self._items = []

    def __len__(self):
        return len(self._items)

    def push(self, value):
        self._items.append(value)

    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError("peek at empty stack")
        return self._items[-1]

    def to_list(self):
        return list(self._items)


def is_valid_parentheses(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for char in text:
        if char in pairs:
            if not stack or stack.pop() != pairs[char]:
                return False
        else:
            stack.append(char)
    return not stack


class MinStack:
    """Each entry stores the minimum so far, so get_min is O(1)."""

    def __init__(self):
        self._items = []

    def push(self, value):
        current_min = min(value, self._items[-1][1]) if self._items else value
        self._items.append((value, current_min))

    def pop(self):
        return self._items.pop()[0]

    def get_min(self):
        return self._items[-1][1]


def daily_temperatures(temps):
    """Days until a warmer temperature; the stack holds indices still waiting."""
    answer = [0] * len(temps)
    stack = []
    for i, temp in enumerate(temps):
        while stack and temps[stack[-1]] < temp:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
