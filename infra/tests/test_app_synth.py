from aws_cdk import App, Environment
from aws_cdk.assertions import Template

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack


def _synth_kb_stack() -> Template:
    app = App()
    stack = KnowledgeBaseStack(
        app,
        "TestKnowledgeBase",
        env=Environment(account="123456789012", region="us-east-2"),
    )
    return Template.from_stack(stack)


def test_stack_synthesizes():
    template = _synth_kb_stack()
    assert template.to_json() is not None
