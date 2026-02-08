from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import json
from PIL import Image
import io
import numpy as np
from colorthief import ColorThief
import random
import torch
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.transforms import functional as F

app = FastAPI(title="Roomify Backend API", description="API for processing room images into 3D scene data")

# Load pre-trained object detection model
model = fasterrcnn_resnet50_fpn(pretrained=True)
model.eval()

# COCO class names (subset for furniture)
COCO_CLASSES = [
    '__background__', 'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus',
    'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
    'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie',
    'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat',
    'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass',
    'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
    'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
]

FURNITURE_CLASSES = ['chair', 'couch', 'bed', 'dining table', 'toilet', 'tv', 'refrigerator']

def detect_furniture_objects(image_bytes):
    """Detect furniture objects in image using pre-trained model."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_tensor = F.to_tensor(img).unsqueeze(0)
        
        with torch.no_grad():
            predictions = model(img_tensor)
        
        boxes = predictions[0]['boxes'].cpu().numpy()
        labels = predictions[0]['labels'].cpu().numpy()
        scores = predictions[0]['scores'].cpu().numpy()
        
        furniture = []
        for box, label, score in zip(boxes, labels, scores):
            if score > 0.5 and COCO_CLASSES[label] in FURNITURE_CLASSES:
                # Convert box to position (center of box, assume floor level)
                x1, y1, x2, y2 = box
                center_x = (x1 + x2) / 2 / img.width * 5.0  # Scale to room width
                center_y = 0  # Floor
                center_z = (y1 + y2) / 2 / img.height * 4.0  # Scale to room depth
                furniture.append({
                    "type": COCO_CLASSES[label],
                    "position": [round(center_x, 1), center_y, round(center_z, 1)]
                })
        
        return furniture if furniture else [{"type": "chair", "position": [2.0, 0, 1.0]}]  # Fallback
    except Exception as e:
        print(f"Error detecting furniture: {e}")
        return [{"type": "chair", "position": [2.0, 0, 1.0]}]

# Mock furniture types
FURNITURE_TYPES = ["chair", "sofa", "table", "bed", "fridge", "cabinet"]

def extract_dominant_colors(image_bytes, num_colors=2):
    """Extract dominant colors from image."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        color_thief = ColorThief(io.BytesIO(image_bytes))
        colors = color_thief.get_palette(color_count=num_colors)
        # Convert RGB to hex
        hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]
        return hex_colors
    except Exception as e:
        print(f"Error extracting colors: {e}")
        return ["#FFFFFF", "#F0F0F0"]  # Default

def estimate_dimensions(image_bytes):
    """Estimate room dimensions from image size."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        # Simple estimation: assume height 3m, scale width/depth
        scale = 3.0 / height  # pixels to meters
        room_width = width * scale
        room_depth = 4.0  # Assume depth
        room_height = 3.0
        return {"width": round(room_width, 1), "height": room_height, "depth": room_depth}
    except Exception as e:
        print(f"Error estimating dimensions: {e}")
        return {"width": 5.0, "height": 3.0, "depth": 4.0}  # Default

def detect_furniture(room_type, image_bytes):
    """Detect furniture using AI model."""
    return detect_furniture_objects(image_bytes)

async def process_image(file: UploadFile, room_no: int):
    """Process a single image to extract room data."""
    image_bytes = await file.read()
    
    # Estimate dimensions
    dimensions = estimate_dimensions(image_bytes)
    
    # Extract colors
    colors = extract_dominant_colors(image_bytes)
    
    # Determine room type (mock: alternate or based on filename)
    room_types = ["living_room", "kitchen", "bedroom", "bathroom"]
    room_type = room_types[room_no % len(room_types)]
    
    # Detect furniture
    furniture = detect_furniture(room_type, image_bytes)
    
    # Position: side by side
    position = [room_no * (dimensions["width"] + 1), 0, 0]  # Offset by width + gap
    
    return {
        "roomno": room_no + 1,
        "roomtype": room_type,
        "position": position,
        "dimensions": dimensions,
        "colors_of_walls": colors,
        "furniture": furniture
    }

@app.post("/upload")
async def upload_images(files: list[UploadFile] = File(...)):
    """
    Upload multiple room images and get 3D scene data.
    Processes each image to extract dimensions, colors, and mock furniture.
    """
    rooms = []
    for i, file in enumerate(files):
        if file.content_type.startswith("image/"):
            room_data = await process_image(file, i)
            rooms.append(room_data)
        else:
            # Skip non-image files
            continue
    
    return JSONResponse(content=rooms)

@app.get("/")
async def root():
    return {"message": "Roomify Backend API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 