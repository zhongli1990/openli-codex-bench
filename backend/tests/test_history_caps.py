"""R6.1 — bounded conversation-history acceptance gate.

Proves that `_assemble_conversation_history` / `_trim_history`:
  • cap to the last MAX_HISTORY_TURNS turns (oldest trimmed FIRST),
  • additionally enforce a MAX_HISTORY_CHARS budget (oldest trimmed first),
  • skip non-completed (failed / in-progress) runs,
  • keep strict session_id scoping (no cross-session bleed),
  • preserve turn-2 recall (the immediately-prior turn is always retained).

Run inside the backend container (has fastapi etc.):
    docker compose -p openbid-bench exec backend \
        python -m pytest tests/test_history_caps.py -q
"""
import asyncio

from app import main as M


# Lightweight monkeypatch shim so this file runs BOTH under pytest and as a
# plain `python -m tests.test_history_caps` script (the backend container image
# ships without pytest). Under pytest the real `monkeypatch` fixture is used.
class _MP:
    def __init__(self):
        self._undo = []

    def setattr(self, obj, name, val):
        self._undo.append((obj, name, getattr(obj, name)))
        setattr(obj, name, val)

    def undo(self):
        for obj, name, old in reversed(self._undo):
            setattr(obj, name, old)
        self._undo.clear()


# ── pure trim function ────────────────────────────────────────────────────────
def test_trim_keeps_last_n_oldest_first():
    hist = [{"role": "user", "content": f"t{i}"} for i in range(20)]
    out = M._trim_history(hist, max_turns=10, max_chars=10_000)
    assert len(out) == 10
    # OLDEST trimmed: t0..t9 gone, t10..t19 kept
    assert out[0]["content"] == "t10"
    assert out[-1]["content"] == "t19"


def test_trim_char_budget_trims_oldest_first():
    # 5 turns of 100 chars each = 500; budget 250 keeps the newest 2 (+maybe).
    hist = [{"role": "user", "content": str(i) * 100} for i in range(5)]
    out = M._trim_history(hist, max_turns=100, max_chars=250)
    assert sum(len(h["content"]) for h in out) <= 250
    # newest retained, oldest dropped
    assert out[-1]["content"] == "4" * 100
    assert out[0]["content"] != "0" * 100


def test_trim_never_strips_single_most_recent_turn():
    hist = [{"role": "user", "content": "x" * 50_000}]
    out = M._trim_history(hist, max_turns=10, max_chars=10)
    assert out == hist  # keep >=1 even if it busts the budget


# ── full assembly with a fake repo ────────────────────────────────────────────
class _FakeRun:
    def __init__(self, rid, prompt, status, created_at):
        self.id = rid
        self.prompt = prompt
        self.status = status
        self.created_at = created_at


class _FakeRepo:
    """Mimics RunRepository.list_by_session / get_events with strict session
    scoping. Answers are reconstructed via a stubbed _assistant_text_from_events."""

    def __init__(self, runs_by_session, answers):
        self._runs = runs_by_session  # {session_id: [_FakeRun,...]}
        self._answers = answers       # {run_id: "answer text"}

    async def list_by_session(self, session_id):
        return list(self._runs.get(session_id, []))

    async def get_events(self, run_id):
        # encode the answer for this run so the stubbed reconstructor can read it
        return [("ANS", self._answers.get(run_id, ""))]


def _run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_assembly_trims_oldest_skips_failed_and_scopes(monkeypatch):
    # stub answer reconstruction: event tuple ("ANS", text) -> text
    monkeypatch.setattr(
        M, "_assistant_text_from_events",
        lambda events: events[0][1] if events else "",
    )
    monkeypatch.setattr(M, "MAX_HISTORY_TURNS", 4)
    monkeypatch.setattr(M, "MAX_HISTORY_CHARS", 100_000)

    # session A: 6 completed runs + 1 failed (the failed one must be skipped)
    runs_a = []
    answers = {}
    for i in range(6):
        rid = f"a{i}"
        runs_a.append(_FakeRun(rid, f"Q{i}", "completed", i))
        answers[rid] = f"A{i}"
    # interleave a FAILED run that must never appear
    runs_a.insert(3, _FakeRun("a_fail", "SHOULD_NOT_APPEAR", "error", 2.5))
    answers["a_fail"] = "FAILED_ANSWER_SHOULD_NOT_APPEAR"

    # session B: distinct content — must NOT leak into A's history
    runs_b = [_FakeRun("b0", "B_LEAK_PROMPT", "completed", 0)]
    answers["b0"] = "B_LEAK_ANSWER"

    repo = _FakeRepo({"A": runs_a, "B": runs_b}, answers)
    hist = _run_async(M._assemble_conversation_history(repo, "A"))

    contents = [h["content"] for h in hist]

    # 1) failed run skipped entirely
    assert "SHOULD_NOT_APPEAR" not in contents
    assert "FAILED_ANSWER_SHOULD_NOT_APPEAR" not in contents

    # 2) no cross-session bleed
    assert "B_LEAK_PROMPT" not in contents
    assert "B_LEAK_ANSWER" not in contents

    # 3) capped to last 4 TURNS (oldest trimmed): 6 completed runs => 12 turns;
    #    last 4 turns = Q4,A4,Q5,A5  (Q0..A3 trimmed)
    assert len(hist) == 4
    assert contents == ["Q4", "A4", "Q5", "A5"]

    # 4) turn-2 recall preserved — the most recent prior turn (A5) is retained
    assert contents[-1] == "A5"


def test_first_turn_yields_empty(monkeypatch):
    monkeypatch.setattr(M, "_assistant_text_from_events", lambda e: "")
    repo = _FakeRepo({"S": []}, {})
    hist = _run_async(M._assemble_conversation_history(repo, "S"))
    assert hist == []


if __name__ == "__main__":
    # Plain-python runner (no pytest in the backend image).
    passed = 0
    for name, fn in sorted(globals().items()):
        if not (name.startswith("test_") and callable(fn)):
            continue
        mp = _MP()
        try:
            if fn.__code__.co_argcount == 1:
                fn(mp)
            else:
                fn()
            print(f"PASS  {name}")
            passed += 1
        finally:
            mp.undo()
    print(f"\n{passed} passed")
