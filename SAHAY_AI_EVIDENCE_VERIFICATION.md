# SAHAY — LOCAL AI BEFORE/AFTER EVIDENCE VERIFICATION ENGINE

**Version**: 1.0.0 (DINOv2 + OpenCV Engine)  
**Architecture**: Local PyTorch / Hugging Face Transformers (`facebook/dinov2-base`) + OpenCV + PostGIS  
**Licensing**: 100% Free & Open-Source (Apache 2.0 / MIT) — **No Paid External AI APIs**

---

## 1. Executive Summary

Sahay integrates a fully functional, local, open-source AI Before/After Evidence Verification Engine into its Python FastAPI microservice.

When an NGO or Municipal Officer submits repair proof (Before image + After image), the engine evaluates visual scene consistency, spatial modifications, duplicate image hashing, PostGIS GPS proximity, and timestamp order to compute an authoritative confidence score and explicit verification state.

```
       BEFORE Evidence IMAGE
                 +
        AFTER Evidence IMAGE
                 ↓
      PIL Preprocessing & EXIF
                 ↓
     Local DINOv2 Feature Extractor (facebook/dinov2-base)
                 ↓
        CLS Token Embedding (768-d)
                 ↓
     Cosine Similarity + OpenCV Change Mask + pHash Hamming
                 ↓
     PostGIS Distance Check (m) & Timestamp Order Check
                 ↓
   Weighted Fusion & Override Rules → Final Verification State
```

---

## 2. Technical Architecture & Component Breakdown

### A. DINOv2 Scene Consistency (`facebook/dinov2-base`)
- **Model**: `facebook/dinov2-base` (Apache-2.0 license).
- **Execution**: Loaded ONCE at FastAPI startup into memory (`model.eval()`).
- **Feature Extraction**: Extracts L2-normalized 768-dimensional CLS token embeddings for both Before and After evidence images.
- **Metric**: Cosine similarity (`np.dot(emb_before, emb_after)`). DINOv2 is invariant to minor lighting, color temperature, and camera angle shifts while recognizing physical scene structure.

### B. OpenCV Visual Difference Analysis
- **Image Alignment & Resizing**: Normalizes images to a standard 512x512 canvas.
- **Pre-filtering**: Converts images to Grayscale and applies `GaussianBlur(5, 5)`.
- **Difference Subtraction & Morphological Filtering**: Computes absolute frame difference (`cv2.absdiff`), Otsu thresholding, and morphological rectangle closing to isolate modified regions.
- **Metrics**: Calculates `change_ratio` (percentage of scene modified) and `visual_change_score`.

### C. Perceptual Image Hashing (pHash / dHash)
- **Duplicate & Reuse Detection**: Computes difference hash (dHash) matrices for evidence images.
- **Hamming Distance**: If `hamming_distance(h1, h2) < 4`, flags `evidence_reuse_detected = True` to detect duplicate or re-uploaded photos.

### D. PostGIS GPS & Timestamp Validation
- **GPS Verification**: Calculates Haversine distance between incident coordinates and evidence upload coordinates vs `max_radius_meters` (50m tolerance).
- **Timestamp Order**: Enforces `after_timestamp > before_timestamp`.

---

## 3. Weighted Evidence Fusion Model

| Signal | Weight | Purpose |
|---|---|---|
| **DINOv2 Scene Consistency** | **30%** | Verifies both photos represent the same physical location/infrastructure |
| **OpenCV Visual Change** | **25%** | Verifies physical modification/repair work actually took place |
| **Location Match (GPS)** | **20%** | Ensures evidence was captured within 50m of incident center |
| **Timestamp / Freshness** | **10%** | Validates chronological sequence |
| **Evidence Originality (pHash)** | **10%** | Prevents duplicate image reuse fraud |
| **Citizen Verification** | **5%** | Incorporates citizen feedback signals |

---

## 4. Override Rules & Verification States

### Override Rules
1. **GPS Discrepancy (>50m away)** → Forces status to `MANUAL_REVIEW_REQUIRED`.
2. **Duplicate Image Reused (Hamming distance < 4)** → Forces status to `MANUAL_REVIEW_REQUIRED`.
3. **Chronological Conflict (After < Before)** → Forces status to `MANUAL_REVIEW_REQUIRED`.

### Verification States
- `VERIFIED_RESOLVED`: Overall confidence $\ge 0.78$ with all deterministic checks passing.
- `LIKELY_RESOLVED`: Overall confidence $\ge 0.62$.
- `MANUAL_REVIEW_REQUIRED`: Confidence $< 0.62$ or critical override triggered.
- `CONFLICTING_EVIDENCE`: Contradictory evidence signals detected.
- `VERIFICATION_FAILED`: Evidence fails verification.

---

## 5. API Endpoint Specifications

### FastAPI AI Service Endpoint
`POST http://localhost:8001/verification/analyze-dinov2`

```json
{
  "before_evidence_url": "https://example.com/before.jpg",
  "after_evidence_url": "https://example.com/after.jpg",
  "incident_lat": 23.259933,
  "incident_lng": 77.412613,
  "evidence_lat": 23.259940,
  "evidence_lng": 77.412620,
  "before_timestamp": 1726400000,
  "after_timestamp": 1726486400,
  "max_radius_meters": 50.0
}
```

#### Sample Structured Response
```json
{
  "status": "VERIFIED_RESOLVED",
  "overallConfidence": 0.84,
  "signals": {
    "dinoSimilarity": 0.88,
    "visualChangeScore": 0.76,
    "alignmentScore": 0.85,
    "changeRatio": 0.142,
    "locationMatch": true,
    "locationDistanceMeters": 1.2,
    "timestampValid": true,
    "evidenceReuseDetected": false,
    "citizenVerification": "PENDING"
  },
  "reasons": [
    "DINOv2 scene consistency similarity: 88.0%",
    "OpenCV detected visual scene change: 14.2% area modified",
    "GPS verification passed: 1.2m from incident center (max 50.0m)",
    "Timestamp order valid: After-evidence is newer than Before-evidence"
  ],
  "processingTimeMs": 142.5,
  "model_info": {
    "model_name": "facebook/dinov2-base",
    "analysis_version": "v1.0-dinov2-opencv",
    "device": "cpu"
  }
}
```

---

## 6. Known Limitations & Auditing Statement

> **Auditing Note**: DINOv2 provides visual feature scene similarity and OpenCV measures pixel-level spatial modifications. AI verification produces strong probabilistic evidence; final authoritative closure involves citizen verification feedback and human review workflows.
