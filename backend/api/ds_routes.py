import sys
import os
# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask import Blueprint
from api.routes import (
    array_routes,
    string_routes,
    hash_table_routes,
    stack_routes,
    queue_routes,
)

ds_api = Blueprint('ds_api', __name__)

# One blueprint per data structure, each owning its own module in api/routes.
for module in (
    array_routes,
    string_routes,
    hash_table_routes,
    stack_routes,
    queue_routes,
):
    ds_api.register_blueprint(module.bp)
