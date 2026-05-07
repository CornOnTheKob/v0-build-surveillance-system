from __future__ import annotations

import json
import os
import sys
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Optional

MODEL_NAME = "ViT-B-32"
PRETRAINED_WEIGHTS = "laion2b_s34b_b79k"
EMBEDDINGS_FILENAME = "embeddings.npy"
INDEX_FILENAME = "faiss.index"
MANIFEST_FILENAME = "manifest.json"
SEMANTIC_LOCK = Lock()
HF_TOKEN_ENV_KEYS = ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACE_HUB_TOKEN")
NATIVE_THREAD_ENV_KEYS = ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS")


def _configure_hf_auth_env() -> bool:
    token = next((value.strip() for key in HF_TOKEN_ENV_KEYS if (value := os.environ.get(key, "")).strip()), "")
    if not token:
        return False

    for key in HF_TOKEN_ENV_KEYS:
        os.environ.setdefault(key, token)

    return True


def _configure_native_threading_environment(platform: Optional[str] = None) -> None:
    resolved_platform = platform or sys.platform
    if resolved_platform != "darwin":
        return

    for key in NATIVE_THREAD_ENV_KEYS:
        os.environ.setdefault(key, "1")


def _configure_runtime_environment() -> None:
    # On macOS, CPU builds of Torch/OpenCLIP and FAISS can load duplicate OpenMP
    # runtimes into the same interpreter. Allowing the duplicate runtime keeps
    # local semantic search usable instead of aborting the worker process.
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    _configure_native_threading_environment()
    _configure_hf_auth_env()


_configure_runtime_environment()


def _storage_dir(backend_dir: Path) -> Path:
    return Path(backend_dir) / "storage" / "semantic"


def _manifest_path(backend_dir: Path) -> Path:
    return _storage_dir(backend_dir) / MANIFEST_FILENAME


def _embeddings_path(backend_dir: Path) -> Path:
    return _storage_dir(backend_dir) / EMBEDDINGS_FILENAME


def _faiss_index_path(backend_dir: Path) -> Path:
    return _storage_dir(backend_dir) / INDEX_FILENAME


def ensure_storage_layout(backend_dir: Path) -> Path:
    target = _storage_dir(backend_dir)
    target.mkdir(parents=True, exist_ok=True)
    return target


def _dependency_status() -> dict[str, bool]:
    status = {"numpy": False, "pillow": False, "torch": False, "openClip": False, "faiss": False, "ready": False}
    try:
        import numpy  # noqa: F401

        status["numpy"] = True
    except Exception:
        pass

    try:
        from PIL import Image  # noqa: F401

        status["pillow"] = True
    except Exception:
        pass

    try:
        import torch  # noqa: F401

        status["torch"] = True
    except Exception:
        pass

    try:
        import open_clip  # noqa: F401

        status["openClip"] = True
    except Exception:
        pass

    try:
        import faiss  # noqa: F401

        status["faiss"] = True
    except Exception:
        pass

    status["ready"] = status["numpy"] and status["pillow"] and status["torch"] and status["openClip"]
    return status


def _faiss_runtime_enabled() -> bool:
    disabled = os.getenv("SEMANTIC_SEARCH_DISABLE_FAISS", "").strip().lower() in {"1", "true", "yes", "on"}
    return not disabled


@lru_cache(maxsize=1)
def _faiss_module() -> Any:
    import faiss

    thread_value = os.getenv("OMP_NUM_THREADS", "1").strip()
    try:
        thread_count = max(1, int(thread_value or "1"))
    except ValueError:
        thread_count = 1

    try:
        faiss.omp_set_num_threads(thread_count)
    except Exception:
        pass

    return faiss


@lru_cache(maxsize=1)
def _clip_components() -> tuple[Any, Any, Any, Any]:
    _configure_hf_auth_env()

    import open_clip
    import torch

    model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED_WEIGHTS, device="cpu")
    model.eval()
    tokenizer = open_clip.get_tokenizer(MODEL_NAME)
    return model, preprocess, tokenizer, torch


def _normalize_vector(vector: Any) -> Optional[Any]:
    import numpy as np

    array = np.asarray(vector, dtype="float32")
    if array.ndim != 1 or array.size == 0:
        return None
    norm = float(np.linalg.norm(array))
    if norm <= 0:
        return None
    return array / norm


def _encode_image(image_path: Path) -> Optional[Any]:
    from PIL import Image

    model, preprocess, _tokenizer, torch = _clip_components()
    image = Image.open(image_path).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        features = model.encode_image(image_tensor)
    return _normalize_vector(features[0].detach().cpu().numpy())


def _encode_text(query: str) -> Optional[Any]:
    model, _preprocess, tokenizer, torch = _clip_components()
    tokens = tokenizer([query.strip()])
    with torch.no_grad():
        features = model.encode_text(tokens)
    return _normalize_vector(features[0].detach().cpu().numpy())


def _backend_relative_path(path: Path, backend_dir: Path) -> Optional[str]:
    try:
        return str(path.relative_to(backend_dir))
    except ValueError:
        return None


def _resolve_backend_path(path_value: Optional[str], backend_dir: Path) -> Optional[Path]:
    if not path_value:
        return None
    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = Path(backend_dir) / candidate
    try:
        candidate.relative_to(Path(backend_dir))
    except ValueError:
        return None
    return candidate


def _track_crop_records(state: dict[str, Any], backend_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for track in state.get("pedestrianTracks", []):
        track_id = str(track.get("id") or "").strip()
        if not track_id:
            continue

        added_track_crop = False
        for crop in track.get("semanticCrops") or []:
            crop_path = _resolve_backend_path(str(crop.get("path") or "").strip(), backend_dir)
            if crop_path is None or not crop_path.exists():
                continue
            records.append(
                {
                    "trackId": track_id,
                    "videoId": str(track.get("videoId") or ""),
                    "pedestrianId": track.get("pedestrianId"),
                    "location": str(track.get("location") or ""),
                    "cropLabel": str(crop.get("label") or "semantic"),
                    "cropPath": _backend_relative_path(crop_path, backend_dir),
                    "frame": crop.get("frame") if crop.get("frame") is not None else track.get("bestFrame") or track.get("firstFrame"),
                    "timestamp": crop.get("timestamp") or track.get("bestTimestamp") or track.get("firstTimestamp"),
                    "offsetSeconds": crop.get("offsetSeconds") if crop.get("offsetSeconds") is not None else track.get("bestOffsetSeconds"),
                    "absolutePath": str(crop_path),
                }
            )
            added_track_crop = True

        if added_track_crop:
            continue

        thumbnail_path = _resolve_backend_path(track.get("thumbnailPath"), backend_dir)
        if thumbnail_path is None or not thumbnail_path.exists():
            continue
        records.append(
            {
                "trackId": track_id,
                "videoId": str(track.get("videoId") or ""),
                "pedestrianId": track.get("pedestrianId"),
                "location": str(track.get("location") or ""),
                "cropLabel": "best",
                "cropPath": _backend_relative_path(thumbnail_path, backend_dir),
                "frame": track.get("bestFrame") or track.get("firstFrame"),
                "timestamp": track.get("bestTimestamp") or track.get("firstTimestamp"),
                "offsetSeconds": track.get("bestOffsetSeconds") if track.get("bestOffsetSeconds") is not None else track.get("firstOffsetSeconds"),
                "absolutePath": str(thumbnail_path),
            }
        )
    return records


def _write_manifest(backend_dir: Path, payload: dict[str, Any]) -> dict[str, Any]:
    ensure_storage_layout(backend_dir)
    _manifest_path(backend_dir).write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _write_manifest_atomic(backend_dir: Path, payload: dict[str, Any]) -> dict[str, Any]:
    ensure_storage_layout(backend_dir)
    target = _manifest_path(backend_dir)
    temporary = target.with_name(f".{target.name}.tmp")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.replace(temporary, target)
    return payload


def _load_manifest(backend_dir: Path) -> dict[str, Any]:
    manifest_path = _manifest_path(backend_dir)
    if not manifest_path.exists():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def rebuild_index(state: dict[str, Any], *, backend_dir: Path) -> dict[str, Any]:
    dependency_status = _dependency_status()
    backend_dir = Path(backend_dir)
    ensure_storage_layout(backend_dir)
    records = _track_crop_records(state, backend_dir)
    manifest = {
        "model": MODEL_NAME,
        "pretrained": PRETRAINED_WEIGHTS,
        "recordCount": 0,
        "ready": False,
        "usesFaiss": False,
        "dependencyStatus": dependency_status,
        "records": [],
    }

    if not dependency_status["ready"] or not records:
        with SEMANTIC_LOCK:
            _embeddings_path(backend_dir).unlink(missing_ok=True)
            _faiss_index_path(backend_dir).unlink(missing_ok=True)
            return _write_manifest_atomic(backend_dir, manifest)

    import numpy as np

    embedded_records: list[dict[str, Any]] = []
    embeddings: list[Any] = []
    for record in records:
        vector = _encode_image(Path(record["absolutePath"]))
        if vector is None:
            continue
        embeddings.append(vector)
        embedded_records.append({key: value for key, value in record.items() if key != "absolutePath"})

    if not embeddings:
        with SEMANTIC_LOCK:
            _embeddings_path(backend_dir).unlink(missing_ok=True)
            _faiss_index_path(backend_dir).unlink(missing_ok=True)
            return _write_manifest_atomic(backend_dir, manifest)

    matrix = np.stack(embeddings).astype("float32")

    uses_faiss = False
    index: Any = None
    if dependency_status["faiss"] and _faiss_runtime_enabled():
        faiss = _faiss_module()

        index = faiss.IndexFlatIP(int(matrix.shape[1]))
        index.add(matrix)
        uses_faiss = True

    manifest.update({
        "recordCount": len(embedded_records),
        "ready": True,
        "usesFaiss": uses_faiss,
        "records": embedded_records,
    })

    with SEMANTIC_LOCK:
        embeddings_path = _embeddings_path(backend_dir)
        embeddings_temp = embeddings_path.with_name(f".{embeddings_path.name}.tmp")
        with embeddings_temp.open("wb") as handle:
            np.save(handle, matrix)
        os.replace(embeddings_temp, embeddings_path)

        faiss_path = _faiss_index_path(backend_dir)
        if uses_faiss and index is not None:
            faiss = _faiss_module()

            faiss_temp = faiss_path.with_name(f".{faiss_path.name}.tmp")
            faiss.write_index(index, str(faiss_temp))
            os.replace(faiss_temp, faiss_path)
        else:
            faiss_path.unlink(missing_ok=True)

        return _write_manifest_atomic(backend_dir, manifest)


def _load_search_snapshot(backend_dir: Path) -> tuple[dict[str, Any], Optional[Any], Optional[Any]]:
    with SEMANTIC_LOCK:
        manifest = _load_manifest(backend_dir)
        if not manifest.get("ready"):
            return manifest, None, None

        records = manifest.get("records") or []
        if not isinstance(records, list) or not records:
            return manifest, None, None

        import numpy as np

        embeddings: Optional[Any] = None
        faiss_index: Optional[Any] = None

        if _faiss_runtime_enabled() and manifest.get("usesFaiss") and _faiss_index_path(backend_dir).exists():
            try:
                faiss = _faiss_module()

                faiss_index = faiss.read_index(str(_faiss_index_path(backend_dir)))
            except Exception:
                faiss_index = None

        if faiss_index is None:
            embeddings_path = _embeddings_path(backend_dir)
            if not embeddings_path.exists():
                return manifest, None, None
            embeddings = np.load(embeddings_path)

        return manifest, embeddings, faiss_index


def search_tracks(query: str, *, backend_dir: Path, limit: int = 24) -> list[dict[str, Any]]:
    if not query.strip() or limit <= 0:
        return []

    backend_dir = Path(backend_dir)
    manifest, embeddings, index = _load_search_snapshot(backend_dir)
    if not manifest.get("ready"):
        return []

    records = manifest.get("records") or []
    if not isinstance(records, list) or not records:
        return []

    text_vector = _encode_text(query)
    if text_vector is None:
        return []

    import numpy as np

    raw_limit = min(len(records), max(limit * 6, limit))
    query_matrix = np.asarray([text_vector], dtype="float32")
    flat_scores: Any
    indices: Any

    if index is not None:
        faiss_scores, faiss_indices = index.search(query_matrix, raw_limit)
        flat_scores = faiss_scores[0]
        indices = faiss_indices[0]
    else:
        if embeddings is None:
            return []
        dot_scores = embeddings @ query_matrix[0]
        indices = np.argsort(-dot_scores)[:raw_limit]
        flat_scores = dot_scores[indices]

    grouped: dict[str, dict[str, Any]] = {}
    for rank, raw_index in enumerate(indices):
        normalized_index = int(raw_index)
        if normalized_index < 0 or normalized_index >= len(records):
            continue
        record = records[normalized_index]
        track_id = str(record.get("trackId") or "")
        if not track_id:
            continue

        score = float(flat_scores[rank])
        current = grouped.get(track_id)
        if current is not None and score <= float(current.get("semanticScore") or 0.0):
            continue

        grouped[track_id] = {
            "id": track_id,
            "videoId": record.get("videoId"),
            "pedestrianId": record.get("pedestrianId"),
            "location": record.get("location"),
            "cropLabel": record.get("cropLabel"),
            "matchedCropPath": record.get("cropPath"),
            "frame": record.get("frame"),
            "offsetSeconds": record.get("offsetSeconds"),
            "timestamp": record.get("timestamp"),
            "semanticScore": score,
        }

    return sorted(grouped.values(), key=lambda item: float(item.get("semanticScore") or 0.0), reverse=True)[:limit]


def search_similar_tracks(track_id: str, *, backend_dir: Path, limit: int = 24) -> list[dict[str, Any]]:
    if not track_id.strip() or limit <= 0:
        return []

    backend_dir = Path(backend_dir)
    manifest, embeddings, _index = _load_search_snapshot(backend_dir)
    if not manifest.get("ready"):
        return []

    records = manifest.get("records") or []
    if not isinstance(records, list) or not records:
        return []

    import numpy as np

    if embeddings is None:
        embeddings_path = _embeddings_path(backend_dir)
        if not embeddings_path.exists():
            return []
        embeddings = np.load(embeddings_path)

    source_indices = [index for index, record in enumerate(records) if str(record.get("trackId") or "") == track_id]
    if not source_indices:
        return []

    source_matrix = np.asarray(embeddings[source_indices], dtype="float32")
    similarity_matrix = np.asarray(embeddings, dtype="float32") @ source_matrix.T
    per_record_scores = similarity_matrix.max(axis=1)

    grouped: dict[str, dict[str, Any]] = {}
    for index, record in enumerate(records):
        candidate_track_id = str(record.get("trackId") or "")
        if not candidate_track_id or candidate_track_id == track_id:
            continue

        score = float(per_record_scores[index])
        current = grouped.get(candidate_track_id)
        if current is not None and score <= float(current.get("semanticScore") or 0.0):
            continue

        grouped[candidate_track_id] = {
            "id": candidate_track_id,
            "videoId": record.get("videoId"),
            "pedestrianId": record.get("pedestrianId"),
            "location": record.get("location"),
            "cropLabel": record.get("cropLabel"),
            "matchedCropPath": record.get("cropPath"),
            "frame": record.get("frame"),
            "offsetSeconds": record.get("offsetSeconds"),
            "timestamp": record.get("timestamp"),
            "semanticScore": score,
        }

    return sorted(grouped.values(), key=lambda item: float(item.get("semanticScore") or 0.0), reverse=True)[:limit]