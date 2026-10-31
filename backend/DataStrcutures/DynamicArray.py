class DynamicArray:
    def __init__(self):
        self._capacity = 2
        self._size = 0
        self._data = [None] * self._capacity
        self._resizes = 0

    def __len__(self):
        return self._size

    def __getitem__(self, i):
        if not 0 <= i < self._size:
            raise IndexError(i)
        return self._data[i]

    def _resize(self, capacity):
        new_data = [None] * capacity
        for i in range(self._size):
            new_data[i] = self._data[i]
        self._data = new_data
        self._capacity = capacity
        self._resizes += 1

    def append(self, value):
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        self._data[self._size] = value
        self._size += 1

    def insert(self, i, value):
        if not 0 <= i <= self._size:
            raise IndexError(i)
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        for j in range(self._size, i, -1):
            self._data[j] = self._data[j - 1]
        self._data[i] = value
        self._size += 1

    def pop(self, i=-1):
        if i < 0:
            i += self._size
        if not 0 <= i < self._size:
            raise IndexError(i)
        value = self._data[i]
        for j in range(i, self._size - 1):
            self._data[j] = self._data[j + 1]
        self._size -= 1
        self._data[self._size] = None
        return value

    def to_dict(self):
        """Full backing store (unused slots are None) plus size, capacity and resize count."""
        return {
            "data": list(self._data),
            "size": self._size,
            "capacity": self._capacity,
            "resizes": self._resizes,
        }


def two_sum_sorted(nums, target):
    """Two pointers on a sorted array."""
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1
    return []


def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1


def max_subarray(nums):
    """Kadane's algorithm."""
    best = current = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        best = max(best, current)
    return best


def range_sum_prefix(nums):
    """Prefix sums: sum of nums[i:j] is prefix[j] - prefix[i]."""
    prefix = [0]
    for num in nums:
        prefix.append(prefix[-1] + num)
    return prefix
