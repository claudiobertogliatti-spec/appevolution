"""Mongo finto minimo (async) per i test del Blueprint: find_one / find / update_one
/ replace_one con $set, $unset, $setOnInsert, upsert, $regex e $in. Niente rete."""
import copy
import re


def _get(doc, dotted):
    cur = doc
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _set(doc, dotted, value):
    parts = dotted.split(".")
    cur = doc
    for part in parts[:-1]:
        if not isinstance(cur.get(part), dict):
            cur[part] = {}
        cur = cur[part]
    cur[parts[-1]] = value


def _unset(doc, dotted):
    parts = dotted.split(".")
    cur = doc
    for part in parts[:-1]:
        cur = cur.get(part)
        if not isinstance(cur, dict):
            return
    cur.pop(parts[-1], None)


def _match(doc, query):
    for key, cond in (query or {}).items():
        val = _get(doc, key)
        if isinstance(cond, dict) and any(k.startswith("$") for k in cond):
            if "$regex" in cond:
                flags = re.IGNORECASE if "i" in cond.get("$options", "") else 0
                if not isinstance(val, str) or not re.search(cond["$regex"], val, flags):
                    return False
            if "$in" in cond and val not in cond["$in"]:
                return False
        elif val != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_a, **_k):
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length=None):
        return [copy.deepcopy(d) for d in self._docs]

    def __aiter__(self):
        self._it = iter([copy.deepcopy(d) for d in self._docs])
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [copy.deepcopy(d) for d in (docs or [])]
        self.writes = 0

    async def find_one(self, query=None, projection=None):
        for d in self.docs:
            if _match(d, query):
                out = copy.deepcopy(d)
                if projection and projection.get("_id") == 0:
                    out.pop("_id", None)
                return out
        return None

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _match(d, query)])

    async def update_one(self, flt, update, upsert=False):
        self.writes += 1
        target = next((d for d in self.docs if _match(d, flt)), None)
        if target is None:
            if not upsert:
                return None
            target = {k: v for k, v in flt.items() if not isinstance(v, dict)}
            for k, v in (update.get("$setOnInsert") or {}).items():
                _set(target, k, v)
            self.docs.append(target)
        for k, v in (update.get("$set") or {}).items():
            _set(target, k, copy.deepcopy(v))
        for k in (update.get("$unset") or {}):
            _unset(target, k)
        return None

    async def replace_one(self, flt, doc, upsert=False):
        self.writes += 1
        for i, d in enumerate(self.docs):
            if _match(d, flt):
                self.docs[i] = copy.deepcopy(doc)
                return None
        if upsert:
            self.docs.append(copy.deepcopy(doc))
        return None


class FakeDb:
    def __init__(self, **collections):
        self._cols = {k: FakeCollection(v) for k, v in collections.items()}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._cols.setdefault(name, FakeCollection())
