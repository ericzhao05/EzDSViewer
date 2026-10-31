from collections import Counter


def is_anagram(a, b):
    return Counter(a) == Counter(b)


def is_palindrome(text):
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True


def longest_unique_substring(text):
    """Sliding window: grow on the right, jump the left past any repeat."""
    last_seen = {}
    left = best = 0
    for right, char in enumerate(text):
        if char in last_seen and last_seen[char] >= left:
            left = last_seen[char] + 1
        last_seen[char] = right
        best = max(best, right - left + 1)
    return best


def longest_unique_window(text):
    """Same sliding window, but also reports where the best window sits.

    Returns (length, start); the window is text[start:start + length].
    """
    last_seen = {}
    left = best = best_start = 0
    for right, char in enumerate(text):
        if char in last_seen and last_seen[char] >= left:
            left = last_seen[char] + 1
        last_seen[char] = right
        if right - left + 1 > best:
            best = right - left + 1
            best_start = left
    return best, best_start
