"""Generic Python bridge sample for RuleOak Core.

Requires the companion ruleoak-py SDK:

    python -m pip install -e ../ruleoak-py
    python examples/python-bridge/generic_bridge_sample.py

Optionally set RULEOAK_CORE_PATH=/path/to/ruleoak-core to run a local JS runtime smoke test.
"""

from pathlib import Path

from ruleoak import (
    AuditEvent,
    CoreBridgeManifest,
    EvidenceRecord,
    FilesystemStore,
    PolicyEvaluator,
    PolicyRule,
    RuleOakRun,
    optional_run_ruleoak_core_smoke,
)

OUT = Path(__file__).resolve().parent / ".bridge_out" / "records"


def main() -> None:
    store = FilesystemStore(OUT)
    run = RuleOakRun.start(domain="generic", workflow="python_bridge", actor="python_sample")
    store.write_run(run)
    store.write_audit(AuditEvent(run_id=run.run_id, event_type="run_started", actor=run.actor))

    evaluator = PolicyEvaluator([
        PolicyRule.allow_if("prepare_summary", reason="Local preparation is allowed."),
        PolicyRule.approval_required_if("publish_summary", reason="Publishing requires human review."),
        PolicyRule.deny_if("delete_source", reason="Source material must not be deleted by this workflow."),
    ])

    decision = evaluator.evaluate(run_id=run.run_id, action="prepare_summary", subject="generic_input")
    store.write_audit(AuditEvent.from_policy_decision(decision, actor=run.actor))

    evidence = EvidenceRecord.create(
        run_id=run.run_id,
        action="prepare_summary",
        subject="generic_input",
        metadata={"core_compatibility": "v1.0", "bridge": "ruleoak-py"},
    )
    store.write_evidence(evidence)
    store.write_audit(AuditEvent.from_evidence(evidence, actor=run.actor))

    manifest = CoreBridgeManifest(OUT, run, metadata={"sample": "generic-python-bridge"}).write()
    core_result = optional_run_ruleoak_core_smoke()

    print(f"Records dir: {OUT}")
    print(f"Bridge manifest: {manifest}")
    print(f"Optional RuleOak Core runtime result: {core_result}")


if __name__ == "__main__":
    main()
