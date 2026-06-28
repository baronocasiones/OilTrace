"""
Tests for the TPM classification engine.

These are pure unit tests — no database or HTTP needed.
They run instantly and validate the core business logic.
"""

import pytest
from app.services.classification import classify_oil, GRADE_PREMIUM, GRADE_STANDARD, GRADE_LOW
from app.schemas import ClassificationResult


class TestClassificationBoundaries:
    """Precision boundary tests for the TPM thresholds."""

    def test_premium_at_19_9(self):
        """TPM 19.9% → still premium (below 20)"""
        result = classify_oil(19.9)
        assert result.grade == GRADE_PREMIUM
        assert result.destination == "SAF"

    def test_standard_at_20_0(self):
        """TPM exactly 20% → standard (lower bound inclusive)"""
        result = classify_oil(20.0)
        assert result.grade == GRADE_STANDARD
        assert result.destination == "blended"

    def test_standard_at_29_9(self):
        """TPM 29.9% → still standard (below 30)"""
        result = classify_oil(29.9)
        assert result.grade == GRADE_STANDARD

    def test_low_at_30_0(self):
        """TPM exactly 30% → low (upper bound of standard excluded)"""
        result = classify_oil(30.0)
        assert result.grade == GRADE_LOW
        assert result.destination == "biofuel"

    def test_low_at_40_0(self):
        """TPM 40% → low (max reasonable value)"""
        result = classify_oil(40.0)
        assert result.grade == GRADE_LOW


class TestClassificationEdgeCases:
    """Edge cases that could break naive implementations."""

    def test_tpm_zero(self):
        """TPM = 0% → fresh oil, should be premium"""
        result = classify_oil(0.0)
        assert result.grade == GRADE_PREMIUM
        assert result.destination == "SAF"

    def test_tpm_very_small(self):
        """TPM = 0.01% → still premium"""
        result = classify_oil(0.01)
        assert result.grade == GRADE_PREMIUM

    def test_negative_tpm_raises_error(self):
        """TPM below 0 is physically impossible → should raise"""
        with pytest.raises(ValueError, match="TPM value cannot be negative"):
            classify_oil(-1.0)

    def test_tpm_above_max_threshold(self):
        """TPM above 40 is extreme but should still classify"""
        result = classify_oil(55.0)
        assert result.grade == GRADE_LOW

    def test_classification_result_has_all_fields(self):
        """Verify the ClassificationResult schema is fully populated"""
        result = classify_oil(15.0)
        assert isinstance(result, ClassificationResult)
        assert result.grade is not None
        assert result.destination is not None
        assert result.description is not None
        assert result.tpm_value == 15.0
        assert result.grade in (GRADE_PREMIUM, GRADE_STANDARD, GRADE_LOW)
        assert result.destination in ("SAF", "blended", "biofuel")


class TestClassificationDescriptions:
    """Check that description text is appropriate per grade."""

    def test_premium_description(self):
        result = classify_oil(10.0)
        assert "aviation" in result.description.lower() or "SAF" in result.description

    def test_low_description(self):
        result = classify_oil(35.0)
        assert "biofuel" in result.description.lower() or "biodiesel" in result.description

    def test_standard_description(self):
        result = classify_oil(25.0)
        assert "blended" in result.description.lower() or "feedstock" in result.description


class TestClassificationThroughput:
    """Performance check — classification must be fast (called per IoT reading)."""

    def test_bulk_classification_speed(self):
        """Classify 10,000 values in under 1 second."""
        import time
        values = [i * 0.01 for i in range(0, 4001)]  # 0.00 to 40.00

        start = time.perf_counter()
        for v in values:
            classify_oil(v)
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0, f"Classification too slow: {elapsed:.3f}s for {len(values)} calls"
