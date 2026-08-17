from __future__ import annotations

import base64
import io
import json
import os
import re
from typing import List

from PIL import Image


def _extract_json_array(text: str):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        return []
    return json.loads(text[start:end + 1])


def extract_roster_names(image_bytes: bytes, api_key: str | None = None, model: str | None = None) -> List[str]:
    """Extract only visible NFL player names from a fantasy roster screenshot.

    Requires an OpenAI API key. The caller should always provide a manual fallback.
    """
    from openai import OpenAI

    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")
    model = model or os.getenv("OPENAI_VISION_MODEL", "gpt-5")

    # Normalize to JPEG to keep payload size reasonable and ensure a supported image MIME type.
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image.thumbnail((1800, 1800))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=88)
    data_url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model,
        input=[{
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": (
                        "This is a screenshot of a fantasy football roster or league screen. "
                        "Return ONLY a strict JSON array of the NFL player names visibly shown on the roster. "
                        "Exclude team names, managers, scores, positions, matchup labels, ads, and navigation text. "
                        "Do not guess names that are not visible. Example: [\"Player One\", \"Player Two\"]"
                    ),
                },
                {"type": "input_image", "image_url": data_url, "detail": "high"},
            ],
        }],
    )
    names = _extract_json_array(response.output_text)
    return [str(n).strip() for n in names if str(n).strip()]
