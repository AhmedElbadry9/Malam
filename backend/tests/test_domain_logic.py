import pytest
from services.client_service import extract_brand_from_url, generate_agency_email
from models import validate_task_transition, TASK_STATUS_TRANSITIONS


class TestUrlAndEmailExtraction:
    """T-001: URL/email edge case tests"""

    @pytest.mark.parametrize("url,expected_brand", [
        ("www.saleh.com", "saleh"),
        ("https://saleh.com/store", "saleh"),
        ("http://www.saleh.sa", "saleh"),
        ("https://store.al-anaqa.com", "al-anaqa"),
        ("http://brand-name.co.uk", "brand-name"),
        ("https://sub.domain.company.store/products?ref=123", "company"),
        ("https://my-agency.ae/", "my-agency"),
        ("face.zid.com", "face.zid"),
        ("https://vanaurasa.zid.com/", "vanaurasa.zid"),
        ("store.salla.sa", "store.salla.sa"),
        ("https://store.salla.sa/", "store.salla.sa"),
        ("saleh", "saleh"),
        ("", ""),
        ("   ", ""),
    ])
    def test_extract_brand_from_url(self, url, expected_brand):
        assert extract_brand_from_url(url) == expected_brand

    def test_generate_agency_email(self):
        assert generate_agency_email("www.saleh.com") == "info+saleh@malamsa.com"
        assert generate_agency_email("https://company.sa") == "info+company@malamsa.com"
        assert generate_agency_email("face.zid.com") == "info+face.zid@malamsa.com"
        assert generate_agency_email("store.salla.sa") == "info+store.salla.sa@malamsa.com"
        assert generate_agency_email("") == ""
        assert generate_agency_email("   ") == ""


class TestTaskStateMachine:
    """T-002: Task state machine transition validation"""

    def test_valid_transitions(self):
        # pending -> in_progress
        assert validate_task_transition("pending", "in_progress") is True
        # in_progress -> under_review
        assert validate_task_transition("in_progress", "under_review") is True
        # in_progress -> completed
        assert validate_task_transition("in_progress", "completed") is True
        # under_review -> completed
        assert validate_task_transition("under_review", "completed") is True
        # under_review -> revision_requested
        assert validate_task_transition("under_review", "revision_requested") is True
        # revision_requested -> in_progress
        assert validate_task_transition("revision_requested", "in_progress") is True
        # revision_requested -> under_review
        assert validate_task_transition("revision_requested", "under_review") is True
        # Same status (no-op) is allowed
        assert validate_task_transition("pending", "pending") is True
        assert validate_task_transition("completed", "completed") is True

    def test_invalid_transitions_blocked(self):
        # pending cannot jump directly to under_review without in_progress
        assert validate_task_transition("pending", "under_review") is False
        # completed cannot transition back to pending
        assert validate_task_transition("completed", "pending") is False
        # under_review cannot transition to pending
        assert validate_task_transition("under_review", "pending") is False
        # invalid status strings are rejected
        assert validate_task_transition("pending", "invalid_status") is False
        assert validate_task_transition("unknown", "in_progress") is False
