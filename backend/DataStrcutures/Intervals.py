import heapq


def overlaps(a, b):
    """Strict overlap: touching endpoints do not count."""
    return a[0] < b[1] and b[0] < a[1]


def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def min_meeting_rooms(intervals):
    """A heap of end times holds the rooms in use."""
    rooms = []
    for start, end in sorted(intervals):
        if rooms and rooms[0] <= start:
            heapq.heappop(rooms)
        heapq.heappush(rooms, end)
    return len(rooms)


def insert_interval(intervals, new):
    """Insert into a sorted, non-overlapping list, merging where needed."""
    out = []
    start, end = new
    i, n = 0, len(intervals)
    while i < n and intervals[i][1] < start:
        out.append(list(intervals[i]))
        i += 1
    while i < n and intervals[i][0] <= end:
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1
    out.append([start, end])
    while i < n:
        out.append(list(intervals[i]))
        i += 1
    return out


def erase_overlap_intervals(intervals):
    """Fewest intervals to remove so the rest do not overlap (greedy by end)."""
    removed = 0
    last_end = None
    for start, end in sorted(intervals, key=lambda p: p[1]):
        if last_end is None or start >= last_end:
            last_end = end
        else:
            removed += 1
    return removed
