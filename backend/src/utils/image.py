import io
from PIL import Image, ImageOps

SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}


class UnsupportedImageError(ValueError):
    """Raised when the uploaded image format is not supported."""
    pass


class InvalidImageError(ValueError):
    """Raised when the image bytes cannot be decoded or are corrupt."""
    pass


class ImageTooLargeError(ValueError):
    """Raised when the total pixel count exceeds maximum allowed."""
    pass


def decode_image(
    data: bytes,
    *,
    max_pixels: int = 40_000_000,
    draft_size: int = 0,
) -> Image.Image:
    """
    Decodes image bytes safely with format checking, pixel limits,
    EXIF orientation correction, and conversion to RGB.
    """
    if not data:
        raise InvalidImageError("Image data is empty")

    try:
        stream = io.BytesIO(data)
        img = Image.open(stream)
    except Exception as e:
        raise InvalidImageError(f"Cannot open image: {e}") from e

    format_name = (img.format or "").upper()
    if format_name not in SUPPORTED_FORMATS:
        raise UnsupportedImageError(
            f"Unsupported format '{format_name}'. Allowed formats: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    width, height = img.size
    total_pixels = width * height
    if total_pixels > max_pixels:
        raise ImageTooLargeError(
            f"Image dimensions ({width}x{height} = {total_pixels:,} px) exceed max allowed {max_pixels:,} px"
        )

    # Optional fast drafting if requested
    if draft_size > 0 and (width > draft_size or height > draft_size):
        try:
            img.draft("RGB", (draft_size, draft_size))
        except Exception:
            pass

    # Orient properly using EXIF metadata and convert to RGB
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    try:
        if img.mode != "RGB":
            img = img.convert("RGB")
    except Exception as e:
        raise InvalidImageError(f"Failed to convert image to RGB: {e}") from e

    return img
