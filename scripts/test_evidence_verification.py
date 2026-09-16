#!/usr/bin/env python3
"""
Sahay — AI Before/After Evidence Verification Script
Tests DINOv2, OpenCV visual difference, pHash duplicate detection, GPS distance, and timestamp verification across 5 realistic test cases.
"""

import os
import sys
import time
from PIL import Image, ImageDraw

# Add ai-services to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'ai-services'))

try:
    from dinov2_engine import load_dinov2_model, run_dinov2_verification
except ImportError as e:
    print(f"Error importing dinov2_engine: {e}")
    sys.exit(1)

def create_synthetic_test_images():
    """Create sample test images for local benchmark evaluation"""
    os.makedirs('/tmp/sahay_test_evidence', exist_ok=True)
    
    # Image 1: Damaged Road / Pothole (Before)
    img_before = Image.new('RGB', (400, 300), color=(120, 120, 120))
    draw = ImageDraw.Draw(img_before)
    draw.rectangle([50, 200, 350, 280], fill=(80, 80, 80)) # Road lane
    draw.ellipse([150, 220, 230, 260], fill=(30, 30, 30))  # Pothole dark patch
    p_before = '/tmp/sahay_test_evidence/before_pothole.jpg'
    img_before.save(p_before)

    # Image 2: Repaired Road (After)
    img_after = Image.new('RGB', (400, 300), color=(120, 120, 120))
    draw_a = ImageDraw.Draw(img_after)
    draw_a.rectangle([50, 200, 350, 280], fill=(80, 80, 80)) # Road lane
    draw_a.ellipse([150, 220, 230, 260], fill=(100, 100, 100)) # Asphalt patch
    draw_a.line([50, 240, 350, 240], fill=(240, 240, 240), width=3) # Fresh paint line
    p_after = '/tmp/sahay_test_evidence/after_repaired.jpg'
    img_after.save(p_after)

    # Image 3: Unresolved Same Pothole
    p_unresolved = p_before

    # Image 4: Different Location / Scene
    img_diff = Image.new('RGB', (400, 300), color=(50, 150, 50)) # Green park
    p_diff = '/tmp/sahay_test_evidence/different_scene.jpg'
    img_diff.save(p_diff)

    return p_before, p_after, p_unresolved, p_diff

def print_result_summary(test_name: str, result: dict):
    print(f"\n==========================================")
    print(f"=== {test_name.upper()} ===")
    print(f"==========================================")
    print(f"Status:             {result['status']}")
    print(f"Overall Confidence: {result['overallConfidence']}")
    print(f"DINOv2 Similarity:  {result['signals']['dinoSimilarity']}")
    print(f"Visual Change Score:{result['signals']['visualChangeScore']}")
    print(f"Location Match:     {result['signals']['locationMatch']} ({result['signals']['locationDistanceMeters']}m)")
    print(f"Timestamp Valid:    {result['signals']['timestampValid']}")
    print(f"Evidence Reused:    {result['signals']['evidenceReuseDetected']}")
    print("\nReasons:")
    for r in result['reasons']:
        print(f"  • {r}")
    print(f"Processing Time:    {result['processingTimeMs']}ms\n")

def run_all_tests():
    print("\n🚀 SAHAY AI EVIDENCE VERIFICATION ENGINE TEST SUITE")
    print("Loading local DINOv2 model and setting up test cases...")
    load_dinov2_model()

    p_before, p_after, p_unresolved, p_diff = create_synthetic_test_images()

    # Test A: Clearly Repaired Pothole
    res_a = run_dinov2_verification(
        before_src=p_before,
        after_src=p_after,
        incident_lat=23.259933,
        incident_lng=77.412613,
        evidence_lat=23.259940,
        evidence_lng=77.412620,
        before_time=time.time() - 86400,
        after_time=time.time()
    )
    print_result_summary("Test A — Repaired Pothole", res_a)

    # Test B: Reused Evidence (Identical Image)
    res_b = run_dinov2_verification(
        before_src=p_before,
        after_src=p_before,
        incident_lat=23.259933,
        incident_lng=77.412613,
        before_time=time.time() - 86400,
        after_time=time.time()
    )
    print_result_summary("Test B — Reused Evidence (Duplicate Image)", res_b)

    # Test C: Discrepant Location (>50m away)
    res_c = run_dinov2_verification(
        before_src=p_before,
        after_src=p_after,
        incident_lat=23.259933,
        incident_lng=77.412613,
        evidence_lat=23.265000, # ~500m away
        evidence_lng=77.418000,
        before_time=time.time() - 86400,
        after_time=time.time()
    )
    print_result_summary("Test C — Location Discrepancy (>50m away)", res_c)

    # Test D: Different Scene / Park Image
    res_d = run_dinov2_verification(
        before_src=p_before,
        after_src=p_diff,
        incident_lat=23.259933,
        incident_lng=77.412613,
        before_time=time.time() - 86400,
        after_time=time.time()
    )
    print_result_summary("Test D — Different Unrelated Scene", res_d)

if __name__ == '__main__':
    run_all_tests()
