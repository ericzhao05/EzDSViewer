def number_of_islands(grid):
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = set()
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                seen.add((r, c))
                stack = [(r, c)]
                while stack:
                    x, y = stack.pop()
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if (0 <= nx < rows and 0 <= ny < cols
                                and grid[nx][ny] == "1" and (nx, ny) not in seen):
                            seen.add((nx, ny))
                            stack.append((nx, ny))
    return count


def island_labels(grid):
    """Same traversal as number_of_islands; returns a grid of island ids (0 = not land)."""
    rows, cols = len(grid), len(grid[0]) if grid else 0
    labels = [[0] * cols for _ in range(rows)]
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and labels[r][c] == 0:
                count += 1
                labels[r][c] = count
                stack = [(r, c)]
                while stack:
                    x, y = stack.pop()
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if (0 <= nx < rows and 0 <= ny < cols
                                and grid[nx][ny] == "1" and labels[nx][ny] == 0):
                            labels[nx][ny] = count
                            stack.append((nx, ny))
    return labels


def rotate_clockwise(matrix):
    """Rotate a square matrix in place: transpose, then reverse each row."""
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
