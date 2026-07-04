class RuleOakError(Exception):
    pass
class RuleOakDenied(RuleOakError):
    pass
class RuleOakApprovalRequired(RuleOakError):
    pass
