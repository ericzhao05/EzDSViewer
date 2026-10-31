import copy

from flask import Blueprint

from DataStrcutures.Matrix import island_labels, number_of_islands, rotate_clockwise
from api.routes._common import body, fail, ok

bp = Blueprint("matrix", __name__, url_prefix="/matrix")

MAX_DIM = 12
MAX_CELL = 3

INITIAL = [
    ["1", "1", "0", "0", "0"],
    ["1", "1", "0", "0", "1"],
    ["0", "0", "1", "0", "0"],
    ["0", "0", "0", "1", "1"],
]

grid = copy.deepcopy(INITIAL)


def _state():
    return {
        "grid": grid,
        "rows": len(grid),
        "cols": len(grid[0]) if grid else 0,
        "limits": {"max_dim": MAX_DIM, "max_cell": MAX_CELL},
    }


def _is_dim(v):
    return isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= MAX_DIM


def _is_cell(v):
    return isinstance(v, str) and 1 <= len(v) <= MAX_CELL


def _is_index(v, limit):
    return isinstance(v, int) and not isinstance(v, bool) and 0 <= v < limit


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global grid
    grid = copy.deepcopy(INITIAL)
    return ok(_state())


@bp.route("/set-cell", methods=["POST"])
def set_cell():
    data = body()
    r, c, v = data.get("row"), data.get("col"), data.get("value")
    if not _is_index(r, len(grid)) or not _is_index(c, len(grid[0])):
        return fail("row and col must be integers inside the grid", _state())
    if not _is_cell(v):
        return fail("value must be a string of 1 to %d characters" % MAX_CELL, _state())
    grid[r][c] = v
    return ok(_state(), v)


@bp.route("/resize", methods=["POST"])
def resize():
    global grid
    data = body()
    r, c = data.get("rows"), data.get("cols")
    if not _is_dim(r) or not _is_dim(c):
        return fail("rows and cols must be integers from 1 to %d" % MAX_DIM, _state())
    grid = [[grid[i][j] if i < len(grid) and j < len(grid[0]) else "0" for j in range(c)]
            for i in range(r)]
    return ok(_state(), {"rows": r, "cols": c})


@bp.route("/set-grid", methods=["POST"])
def set_grid():
    global grid
    new = body().get("grid")
    valid = (
        isinstance(new, list) and 1 <= len(new) <= MAX_DIM
        and all(isinstance(row, list) for row in new)
        and 1 <= len(new[0]) <= MAX_DIM
        and all(len(row) == len(new[0]) for row in new)
        and all(_is_cell(v) for row in new for v in row)
    )
    if not valid:
        return fail(
            "grid must be a rectangle of 1 to %d rows and columns of strings (max %d chars)"
            % (MAX_DIM, MAX_CELL), _state())
    grid = [list(row) for row in new]
    return ok(_state())


@bp.route("/rotate", methods=["POST"])
def rotate():
    if len(grid) != len(grid[0]):
        return fail("Rotation needs a square matrix; resize to equal rows and columns", _state())
    rotate_clockwise(grid)
    return ok(_state())


@bp.route("/islands", methods=["POST"])
def islands():
    return ok(_state(), {"count": number_of_islands(grid), "labels": island_labels(grid)})
